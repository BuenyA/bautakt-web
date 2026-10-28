import {
  formatMoney,
  formatMoneyInput,
  fromMinorUnits,
  parseMoneyInput,
  todayIso,
} from '@bautakt/finance';
import { DangerButton, toast } from '@bautakt/ui';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  Label,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  Spinner,
  Text,
  Textarea,
  Tooltip,
} from '@fluentui/react-components';
import { DocumentRegular } from '@fluentui/react-icons';
import { type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useNavigate, useParams } from 'react-router';

import { PageHeader } from '@/components/common/PageHeader';
import { DatePicker } from '@/components/form/dateTime';
import { ContactPicker } from '@/features/contacts/ContactPicker';
import type { ContactListRow } from '@/features/contacts/useContacts';
import { useOrders } from '@/features/orders/useOrders';
import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';

import { IncomingInvoiceDropzone } from '../IncomingInvoiceDropzone';
import {
  canDelete,
  canEditFields,
  type IncomingInvoiceStatus,
  isIncomingInvoiceStatus,
  statusOptions,
  suggestGross,
  validateIncomingInvoice,
} from '../incomingInvoiceForm';
import {
  applySuggestion,
  type InvoiceSuggestion,
  MAX_UPLOAD_BYTES,
  type SuggestibleField,
  type SuggestibleValues,
  type UploadKind,
  uploadKind,
} from '../incomingInvoiceUpload';
import { PdfViewer } from '../PdfViewer';
import { useCostCategories } from '../useCostCategories';
import {
  type IncomingInvoiceRow,
  IncomingUploadError,
  parseIncomingFile,
  useDeleteIncomingDraft,
  useIncomingInvoice,
  useSaveIncomingInvoice,
  useStoreIncomingFile,
} from '../useIncomingInvoice';
import { useArchivedPdf } from '../useSalesDocument';

/**
 * Eingangsrechnung erfassen oder öffnen (bautakt-web#88), Parität zu
 * `payables.tsx` der App.
 *
 * Eine eigene Seite wie der Editor der Ausgangsrechnung, kein Panel von rechts
 * (Owner 28.10.2026): links das Formular, rechts der Beleg, wie er
 * hochgeladen wurde — so lässt sich abtippen, was auf dem Papier steht.
 *
 * Felder bearbeiten nur im Entwurf; ein erfasster Beleg ist
 * aufbewahrungspflichtig und ändert nur noch seinen Status. Löschen nur im
 * Entwurf. Die Grenze ziehen die Trigger der Datenbank, das Formular bietet
 * nur an, was dort durchgeht.
 */
export function IncomingInvoicePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const invoiceId = id ?? null;
  const invoice = useIncomingInvoice(invoiceId);

  if (invoiceId === null) return <IncomingInvoiceForm saved={null} />;
  if (invoice.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (invoice.isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={t('domain:incomingInvoiceForm.editTitle')} />
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {readableDbError(invoice.error) ?? t('domain:incomingInvoiceForm.loadError')}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => void invoice.refetch()}>{t('common:action.retry')}</Button>
          </MessageBarActions>
        </MessageBar>
      </div>
    );
  }
  return <IncomingInvoiceForm key={invoice.data.id} saved={invoice.data} />;
}

/**
 * Nach Speichern, Löschen oder Abbrechen immer zurück auf die Übersicht der
 * Rechnungen, egal ob man aus der Liste kam (Owner 28.10.2026).
 */
function useLeave() {
  const navigate = useNavigate();
  return () => void navigate(routes.financeHub);
}

const toInput = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : formatMoneyInput(value);

/** Stand des Auslesens nach einem Upload. */
type ReadState =
  | { state: 'idle' }
  | { state: 'running' }
  | {
      state: 'suggested';
      format: InvoiceSuggestion['sourceFormat'];
      foreignCurrency: string | null;
    }
  /** Kein E-Rechnungs-XML; bei Fotos wird gar nicht erst gelesen. */
  | { state: 'none'; photo: boolean }
  | { state: 'error'; file: File; kind: UploadKind };

function IncomingInvoiceForm({ saved }: { saved: IncomingInvoiceRow | null }) {
  const { t } = useTranslation();
  const leave = useLeave();
  const save = useSaveIncomingInvoice();
  const remove = useDeleteIncomingDraft();
  const storeFile = useStoreIncomingFile();
  const categories = useCostCategories();
  const orders = useOrders();
  const ids = {
    supplier: useId(),
    vendor: useId(),
    number: useId(),
    date: useId(),
    due: useId(),
    net: useId(),
    vat: useId(),
    gross: useId(),
    order: useId(),
    category: useId(),
    status: useId(),
    notes: useId(),
  };

  const savedStatus: IncomingInvoiceStatus | null =
    saved && isIncomingInvoiceStatus(saved.status) ? saved.status : null;
  const editable = canEditFields(savedStatus);

  const [supplierId, setSupplierId] = useState<string | null>(saved?.supplier_id ?? null);
  const [vendorName, setVendorName] = useState(saved?.vendor_name ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(saved?.invoice_number ?? '');
  const [invoiceDate, setInvoiceDate] = useState(saved?.invoice_date ?? todayIso());
  const [dueDate, setDueDate] = useState(saved?.due_date ?? '');
  const [net, setNet] = useState(toInput(saved?.net_total));
  const [vat, setVat] = useState(toInput(saved?.vat_total));
  const [gross, setGross] = useState(toInput(saved?.gross_total));
  const [orderId, setOrderId] = useState(saved?.order_id ?? '');
  const [categoryId, setCategoryId] = useState(saved?.cost_category_id ?? '');
  const [notes, setNotes] = useState(saved?.notes ?? '');
  const [status, setStatus] = useState<IncomingInvoiceStatus>(savedStatus ?? 'open');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Upload (#88, Teil 2). `attached`: die Datei, die in dieser Sitzung abgelegt
  // wurde; bei einer neuen Rechnung entsteht dabei der Entwurf.
  const [attached, setAttached] = useState<{
    id: string;
    fileName: string;
    file: File;
    kind: UploadKind;
  } | null>(null);
  const [uploadError, setUploadError] = useState<{ message: string; file: File | null } | null>(
    null,
  );
  const [read, setRead] = useState<ReadState>({ state: 'idle' });
  const [suggested, setSuggested] = useState<ReadonlySet<SuggestibleField>>(new Set());
  const [eInvoice, setEInvoice] = useState<Pick<
    InvoiceSuggestion,
    'vendorVatId' | 'sourceFormat'
  > | null>(null);

  const invoiceId = saved?.id ?? attached?.id ?? null;
  const hasOriginal = Boolean(saved?.storage_path) || attached !== null;
  const draftStatus: IncomingInvoiceStatus | null = savedStatus ?? (attached ? 'draft' : null);
  const uploading = storeFile.isPending || read.state === 'running';

  /** Wer ein vorgeschlagenes Feld ändert, hat es geprüft: Markierung weg. */
  function touched(field: SuggestibleField) {
    if (!suggested.has(field)) return;
    setSuggested((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  }

  // Wegnavigieren mit Ungespeichertem fragt nach, wie im Rechnungs-Editor.
  // Nach Speichern, Löschen oder Abbrechen geht es ohne Rückfrage (`leavingRef`).
  const snapshot = JSON.stringify([
    supplierId,
    vendorName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    net,
    vat,
    gross,
    orderId,
    categoryId,
    notes,
    status,
  ]);
  const [baseline] = useState(snapshot);
  const dirty = snapshot !== baseline;
  const dirtyRef = useRef(dirty);
  const leavingRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leavingRef.current && dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function done() {
    leavingRef.current = true;
    leave();
  }

  // Die Meldung steht unter dem letzten Feld; ohne Scrollen sähe sie keiner.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [error]);

  const fields = {
    vendorName,
    invoiceDate,
    dueDate,
    netMinor: parseMoneyInput(net),
    vatMinor: parseMoneyInput(vat),
    grossMinor: parseMoneyInput(gross),
  };

  function onSupplier(contact: ContactListRow | null) {
    setSupplierId(contact?.id ?? null);
    if (!contact) return;
    // Der Name auf dem Beleg bleibt überschreibbar.
    setVendorName(contact.name);
    if (!categoryId && contact.default_cost_category_id) {
      setCategoryId(contact.default_cost_category_id);
    }
  }

  async function onFile(file: File) {
    setUploadError(null);
    const kind = uploadKind(file.name, file.type);
    if (!kind) {
      setUploadError({
        message: t('domain:incomingInvoiceForm.upload.errors.unsupported'),
        file: null,
      });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError({
        message: t('domain:incomingInvoiceForm.upload.errors.tooLarge'),
        file: null,
      });
      return;
    }
    try {
      const stored = await storeFile.mutateAsync({ invoiceId, file });
      setAttached({ id: stored.id, fileName: file.name, file, kind });
    } catch (caught) {
      const key = caught instanceof IncomingUploadError ? caught.key : 'unknown';
      // Wiederholen hilft nur, wenn der Fehler nicht an der Datei selbst liegt.
      const retry = key === 'unknown' ? file : null;
      setUploadError({
        message: t(`domain:incomingInvoiceForm.upload.errors.${key}`),
        file: retry,
      });
      return;
    }
    await readEInvoice(file, kind);
  }

  async function readEInvoice(file: File, kind: UploadKind) {
    setRead({ state: 'running' });
    try {
      const outcome = await parseIncomingFile(file, kind);
      if (outcome.status === 'none') {
        setRead({ state: 'none', photo: kind === 'image' });
        return;
      }
      const current: SuggestibleValues = {
        vendorName,
        invoiceNumber,
        invoiceDate,
        dueDate,
        net,
        vat,
        gross,
      };
      const { values, filled } = applySuggestion(current, outcome.suggestion, todayIso(), (minor) =>
        formatMoneyInput(fromMinorUnits(minor)),
      );
      setVendorName(values.vendorName);
      setInvoiceNumber(values.invoiceNumber);
      setInvoiceDate(values.invoiceDate);
      setDueDate(values.dueDate);
      setNet(values.net);
      setVat(values.vat);
      setGross(values.gross);
      setSuggested(new Set(filled));
      setEInvoice({
        vendorVatId: outcome.suggestion.vendorVatId,
        sourceFormat: outcome.suggestion.sourceFormat,
      });
      setRead({
        state: 'suggested',
        format: outcome.suggestion.sourceFormat,
        foreignCurrency: outcome.foreignCurrency,
      });
    } catch (caught) {
      console.error('finance-inbound-parse', caught);
      setRead({ state: 'error', file, kind });
    }
  }

  // Brutto aus Netto + USt, sobald beides da ist und Brutto noch leer.
  function fillGross() {
    if (gross.trim()) return;
    const suggested = suggestGross(fields);
    if (suggested !== null) {
      setGross(formatMoneyInput(fromMinorUnits(suggested)));
      touched('gross');
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (editable) {
      const problems = validateIncomingInvoice(fields, status);
      if (problems.length > 0) {
        setError(problems.map((key) => t(`domain:incomingInvoiceForm.errors.${key}`)).join(' '));
        return;
      }
    }

    try {
      await save.mutateAsync({
        id: invoiceId,
        onlyStatus: !editable,
        values: {
          status,
          supplier_id: supplierId,
          vendor_name: vendorName.trim(),
          invoice_number: invoiceNumber.trim(),
          invoice_date: invoiceDate || todayIso(),
          due_date: dueDate || null,
          net_total: fromMinorUnits(fields.netMinor ?? 0),
          vat_total: fromMinorUnits(fields.vatMinor ?? 0),
          gross_total: fromMinorUnits(fields.grossMinor ?? 0),
          order_id: orderId || null,
          cost_category_id: categoryId || null,
          notes: notes.trim(),
          ...(eInvoice
            ? { vendor_vat_id: eInvoice.vendorVatId ?? '', source_format: eInvoice.sourceFormat }
            : {}),
        },
      });
      toast.success(t('domain:incomingInvoiceForm.saved'));
      done();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:incomingInvoiceForm.saveError'));
    }
  }

  async function onDelete() {
    if (!invoiceId) return;
    try {
      await remove.mutateAsync(invoiceId);
      toast.success(t('domain:incomingInvoiceForm.deleted'));
      setConfirmDelete(false);
      done();
    } catch (caught) {
      setConfirmDelete(false);
      setError(readableDbError(caught) ?? t('domain:incomingInvoiceForm.deleteError'));
    }
  }

  const sumOk =
    fields.netMinor !== null &&
    fields.vatMinor !== null &&
    fields.grossMinor !== null &&
    fields.netMinor + fields.vatMinor === fields.grossMinor;

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {invoiceId ? (
        canDelete(draftStatus) ? (
          <DangerButton type="button" onClick={() => setConfirmDelete(true)}>
            {t('common:action.delete')}
          </DangerButton>
        ) : (
          <Tooltip
            content={t('domain:incomingInvoiceForm.deleteRetained')}
            relationship="description"
          >
            <Button type="button" disabledFocusable>
              {t('common:action.delete')}
            </Button>
          </Tooltip>
        )
      ) : null}
      <Button type="button" onClick={done}>
        {t('common:action.cancel')}
      </Button>
      <Button appearance="primary" type="submit" disabled={save.isPending || uploading}>
        {t('common:action.save')}
      </Button>
    </div>
  );

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <PageHeader
        title={
          saved ? t('domain:incomingInvoiceForm.editTitle') : t('domain:incomingInvoiceForm.title')
        }
        description={
          editable
            ? t('domain:incomingInvoiceForm.description')
            : t('domain:incomingInvoiceForm.retainedDescription')
        }
        actions={actions}
      />

      {/* Split-Screen wie im Rechnungs-Editor: links das Formular, rechts der
          Beleg. Unter xl untereinander. Die Raster im Formular richten sich
          nach der Spaltenbreite (`@container`), nicht nach dem Fenster. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="@container flex min-w-0 flex-col gap-4">
          <ReadMessage read={read} onRetry={(file, kind) => void readEInvoice(file, kind)} />

          <Section title={t('domain:incomingInvoiceForm.sections.invoice')}>
            <div className="grid gap-4 @lg:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={ids.supplier}>{t('domain:expenses.columns.vendor')}</Label>
                <ContactPicker
                  id={ids.supplier}
                  contactRole="supplier"
                  value={supplierId}
                  onChange={onSupplier}
                  allowNone
                  noneLabel={t('domain:expenseForm.noSupplier')}
                  disabled={!editable}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={ids.vendor} required={status !== 'draft'}>
                  {t('domain:expenseForm.vendorOnReceipt')}
                  <SuggestedMark show={suggested.has('vendorName')} />
                </Label>
                <Input
                  id={ids.vendor}
                  value={vendorName}
                  disabled={!editable}
                  onChange={(event) => {
                    setVendorName(event.target.value);
                    touched('vendorName');
                  }}
                />
              </div>

              <div className="grid gap-2 @lg:col-span-2">
                <Label htmlFor={ids.number}>
                  {t('domain:expenses.columns.number')}
                  <SuggestedMark show={suggested.has('invoiceNumber')} />
                </Label>
                <Input
                  id={ids.number}
                  value={invoiceNumber}
                  disabled={!editable}
                  onChange={(event) => {
                    setInvoiceNumber(event.target.value);
                    touched('invoiceNumber');
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={ids.date} required={status !== 'draft'}>
                  {t('domain:expenses.columns.date')}
                  <SuggestedMark show={suggested.has('invoiceDate')} />
                </Label>
                <DatePicker
                  id={ids.date}
                  aria-label={t('domain:expenses.columns.date')}
                  value={invoiceDate}
                  onChange={(value) => {
                    setInvoiceDate(value);
                    touched('invoiceDate');
                  }}
                  disabled={!editable}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={ids.due} required={status !== 'draft'}>
                  {t('domain:expenses.columns.due')}
                  <SuggestedMark show={suggested.has('dueDate')} />
                </Label>
                <DatePicker
                  id={ids.due}
                  aria-label={t('domain:expenses.columns.due')}
                  value={dueDate}
                  onChange={(value) => {
                    setDueDate(value);
                    touched('dueDate');
                  }}
                  disabled={!editable}
                />
              </div>
            </div>
          </Section>

          <Section title={t('domain:incomingInvoiceForm.sections.amounts')}>
            <div className="grid gap-4 @lg:grid-cols-3">
              <MoneyField
                id={ids.net}
                label={t('domain:invoices.net')}
                value={net}
                onChange={(value) => {
                  setNet(value);
                  touched('net');
                }}
                suggested={suggested.has('net')}
                onBlur={fillGross}
                required={status !== 'draft'}
                disabled={!editable}
              />
              <MoneyField
                id={ids.vat}
                label={t('domain:invoices.vat')}
                value={vat}
                onChange={(value) => {
                  setVat(value);
                  touched('vat');
                }}
                suggested={suggested.has('vat')}
                onBlur={fillGross}
                required={status !== 'draft'}
                disabled={!editable}
              />
              <MoneyField
                id={ids.gross}
                label={t('domain:invoices.gross')}
                value={gross}
                onChange={(value) => {
                  setGross(value);
                  touched('gross');
                }}
                suggested={suggested.has('gross')}
                required={status !== 'draft'}
                disabled={!editable}
              />
            </div>
            {editable &&
            fields.netMinor !== null &&
            fields.vatMinor !== null &&
            fields.grossMinor !== null ? (
              <p className={sumOk ? 'text-muted-foreground text-sm' : 'text-destructive text-sm'}>
                {sumOk
                  ? t('domain:incomingInvoiceForm.sumOk')
                  : t('domain:incomingInvoiceForm.sumHint', {
                      expected: formatMoney(fields.netMinor + fields.vatMinor),
                    })}
              </p>
            ) : null}
          </Section>

          <Section title={t('domain:incomingInvoiceForm.sections.assignment')}>
            <div className="grid gap-4 @lg:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={ids.order}>{t('domain:incomingInvoiceForm.order')}</Label>
                <Select
                  id={ids.order}
                  value={orderId}
                  disabled={!editable}
                  onChange={(_, { value }) => setOrderId(value)}
                >
                  <option value="">{t('domain:incomingInvoiceForm.noOrder')}</option>
                  {(orders.data ?? []).map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={ids.category}>{t('domain:expenses.columns.category')}</Label>
                <Select
                  id={ids.category}
                  value={categoryId}
                  disabled={!editable}
                  onChange={(_, { value }) => setCategoryId(value)}
                >
                  <option value="">{t('domain:incomingInvoiceForm.noCategory')}</option>
                  {(categories.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={ids.status}>{t('domain:incomingInvoiceForm.status')}</Label>
                <Select
                  id={ids.status}
                  value={status}
                  onChange={(_, { value }) => {
                    if (isIncomingInvoiceStatus(value)) setStatus(value);
                  }}
                >
                  {statusOptions(savedStatus).map((option) => (
                    <option key={option} value={option}>
                      {t(`domain:incomingInvoiceStatus.${option}`)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2 @lg:col-span-2">
                <Label htmlFor={ids.notes}>{t('domain:contactForm.notes')}</Label>
                <Textarea
                  id={ids.notes}
                  rows={3}
                  value={notes}
                  disabled={!editable}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>
          </Section>

          {error ? (
            <div ref={errorRef}>
              <MessageBar intent="error" layout="multiline">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            </div>
          ) : null}

          {/* Dieselben Knöpfe wie oben: wer unten fertig ist, muss nicht hochscrollen. */}
          <div className="border-border border-t pt-4">{actions}</div>
        </div>

        {/* Der Beleg bleibt beim Scrollen des Formulars stehen. */}
        <aside
          aria-label={t('domain:incomingInvoiceForm.original.title')}
          className="flex min-h-0 flex-col gap-3 xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]"
        >
          {hasOriginal ? (
            <Text size={200} className="text-muted-foreground flex shrink-0 items-center gap-2">
              <DocumentRegular fontSize={16} />
              {attached
                ? t('domain:incomingInvoiceForm.upload.attachedName', { name: attached.fileName })
                : t('domain:incomingInvoiceForm.upload.attached')}
            </Text>
          ) : null}
          {uploadError ? (
            <MessageBar intent="error" layout="multiline" className="shrink-0">
              <MessageBarBody>{uploadError.message}</MessageBarBody>
              {uploadError.file ? (
                <MessageBarActions>
                  <Button
                    onClick={() => {
                      if (uploadError.file) void onFile(uploadError.file);
                    }}
                  >
                    {t('common:action.retry')}
                  </Button>
                </MessageBarActions>
              ) : null}
            </MessageBar>
          ) : null}
          {attached ? (
            <OriginalView file={attached.file} kind={attached.kind} />
          ) : saved?.storage_path ? (
            <StoredOriginal storagePath={saved.storage_path} />
          ) : editable ? (
            <IncomingInvoiceDropzone
              busy={uploading}
              onFile={(file) => void onFile(file)}
              className="min-h-64 flex-1 justify-center"
            />
          ) : (
            <OriginalEmpty text={t('domain:incomingInvoiceForm.original.none')} />
          )}
        </aside>
      </div>

      <Dialog open={confirmDelete} onOpenChange={(_, data) => setConfirmDelete(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('domain:incomingInvoiceForm.deleteTitle')}</DialogTitle>
            <DialogContent>{t('domain:incomingInvoiceForm.deleteText')}</DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDelete(false)}>{t('common:action.cancel')}</Button>
              <DangerButton onClick={() => void onDelete()} disabled={remove.isPending}>
                {t('common:action.delete')}
              </DangerButton>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(_, data) => {
          if (!data.open) blocker.reset?.();
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('domain:editor.discard.title')}</DialogTitle>
            <DialogContent>{t('domain:editor.discard.description')}</DialogContent>
            <DialogActions>
              <Button onClick={() => blocker.reset?.()}>{t('domain:editor.discard.keep')}</Button>
              <Button appearance="primary" onClick={() => blocker.proceed?.()}>
                {t('domain:editor.discard.confirm')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </form>
  );
}

/** Abschnitt des Formulars, wie im Rechnungs-Editor. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="large">
      <CardHeader
        header={
          <Text as="h2" size={400} weight="semibold">
            {title}
          </Text>
        }
      />
      {children}
    </Card>
  );
}

/** Der Beleg aus dem Archiv; die Art folgt der Endung des Pfads. */
function StoredOriginal({ storagePath }: { storagePath: string }) {
  const { t } = useTranslation();
  const original = useArchivedPdf(storagePath);
  if (original.isError) {
    return <OriginalEmpty text={t('domain:incomingInvoiceForm.original.loadError')} />;
  }
  if (!original.data) {
    return (
      <div className="flex min-h-64 flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <OriginalView bytes={original.data} kind={uploadKind(storagePath, '')} />;
}

/** PDF Seite für Seite, Fotos als Bild; reines XML hat kein Druckbild. */
function OriginalView({
  file,
  bytes,
  kind,
}: {
  file?: File;
  bytes?: Uint8Array;
  kind: UploadKind | null;
}) {
  const { t } = useTranslation();
  const [filePdf, setFilePdf] = useState<Uint8Array | null>(null);
  const imageUrl = useMemo(() => {
    if (kind !== 'image') return null;
    const blob = file ?? (bytes ? new Blob([bytes.slice()]) : null);
    return blob ? URL.createObjectURL(blob) : null;
  }, [file, bytes, kind]);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );

  useEffect(() => {
    if (kind !== 'pdf' || !file) return;
    let cancelled = false;
    void file.arrayBuffer().then((buffer) => {
      if (!cancelled) setFilePdf(new Uint8Array(buffer));
    });
    return () => {
      cancelled = true;
    };
  }, [file, kind]);

  if (kind === 'pdf') {
    const pdf = bytes ?? filePdf;
    return (
      <div className="flex h-[80vh] min-h-0 flex-col xl:h-auto xl:flex-1">
        <PdfViewer data={pdf} loading={pdf === null} />
      </div>
    );
  }
  if (kind === 'image' && imageUrl) {
    return (
      <div className="border-border bg-muted flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-xl border p-4">
        <img
          src={imageUrl}
          alt={t('domain:incomingInvoiceForm.original.title')}
          className="max-w-full rounded shadow-sm"
        />
      </div>
    );
  }
  return <OriginalEmpty text={t('domain:incomingInvoiceForm.original.xml')} />;
}

function OriginalEmpty({ text }: { text: string }) {
  return (
    <div className="border-border text-muted-foreground flex min-h-64 flex-1 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm">
      {text}
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  onBlur,
  required,
  disabled,
  suggested,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required: boolean;
  disabled: boolean;
  suggested: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} required={required}>
        {label}
        <SuggestedMark show={suggested} />
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        input={{ className: 'text-right tabular-nums' }}
        placeholder="0,00"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}

/** Markiert einen Wert aus der E-Rechnung, bis jemand das Feld ändert. */
function SuggestedMark({ show }: { show: boolean }) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <Badge appearance="tint" color="informative" size="small" className="ml-2">
      {t('domain:incomingInvoiceForm.upload.suggested')}
    </Badge>
  );
}

function ReadMessage({
  read,
  onRetry,
}: {
  read: ReadState;
  onRetry: (file: File, kind: UploadKind) => void;
}) {
  const { t } = useTranslation();
  switch (read.state) {
    case 'idle':
      return null;
    case 'running':
      return <Spinner size="tiny" label={t('domain:incomingInvoiceForm.upload.reading')} />;
    case 'suggested':
      return (
        <>
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody>
              {t('domain:incomingInvoiceForm.upload.suggestedInfo', {
                format: t(`domain:incomingInvoiceForm.upload.format.${read.format}`),
              })}
            </MessageBarBody>
          </MessageBar>
          {read.foreignCurrency ? (
            <MessageBar intent="warning" layout="multiline">
              <MessageBarBody>
                {t('domain:incomingInvoiceForm.upload.foreignCurrency', {
                  currency: read.foreignCurrency,
                })}
              </MessageBarBody>
            </MessageBar>
          ) : null}
        </>
      );
    case 'none':
      return (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            {read.photo
              ? t('domain:incomingInvoiceForm.upload.photo')
              : t('domain:incomingInvoiceForm.upload.noEInvoice')}
          </MessageBarBody>
        </MessageBar>
      );
    case 'error':
      return (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>{t('domain:incomingInvoiceForm.upload.readError')}</MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => onRetry(read.file, read.kind)}>
              {t('common:action.retry')}
            </Button>
          </MessageBarActions>
        </MessageBar>
      );
  }
}
