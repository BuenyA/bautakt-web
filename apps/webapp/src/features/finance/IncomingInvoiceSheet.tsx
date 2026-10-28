import {
  formatMoney,
  formatMoneyInput,
  fromMinorUnits,
  parseMoneyInput,
  todayIso,
} from '@bautakt/finance';
import {
  DangerButton,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  Spinner,
  Textarea,
  Tooltip,
} from '@fluentui/react-components';
import { DocumentRegular } from '@fluentui/react-icons';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker } from '@/components/form/dateTime';
import { ContactPicker } from '@/features/contacts/ContactPicker';
import type { ContactListRow } from '@/features/contacts/useContacts';
import { useOrders } from '@/features/orders/useOrders';
import { readableDbError } from '@/lib/dbErrors';

import { IncomingInvoiceDropzone } from './IncomingInvoiceDropzone';
import {
  canDelete,
  canEditFields,
  type IncomingInvoiceStatus,
  isIncomingInvoiceStatus,
  statusOptions,
  suggestGross,
  validateIncomingInvoice,
} from './incomingInvoiceForm';
import {
  applySuggestion,
  type InvoiceSuggestion,
  MAX_UPLOAD_BYTES,
  type SuggestibleField,
  type SuggestibleValues,
  type UploadKind,
  uploadKind,
} from './incomingInvoiceUpload';
import { useCostCategories } from './useCostCategories';
import {
  type IncomingInvoiceRow,
  IncomingUploadError,
  parseIncomingFile,
  useDeleteIncomingDraft,
  useIncomingInvoice,
  useSaveIncomingInvoice,
  useStoreIncomingFile,
} from './useIncomingInvoice';

/**
 * Eingangsrechnung erfassen oder öffnen (bautakt-web#88), Parität zu
 * `payables.tsx` der App.
 *
 * Felder bearbeiten nur im Entwurf; ein erfasster Beleg ist
 * aufbewahrungspflichtig und ändert nur noch seinen Status. Löschen nur im
 * Entwurf. Die Grenze ziehen die Trigger der Datenbank, das Formular bietet
 * nur an, was dort durchgeht.
 */
export function IncomingInvoiceSheet({
  open,
  invoiceId,
  onOpenChange,
}: {
  open: boolean;
  /** `null`: neue Eingangsrechnung. */
  invoiceId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormDrawer open={open} onOpenChange={onOpenChange}>
      {open ? (
        <IncomingInvoiceLoader
          key={invoiceId ?? 'new'}
          invoiceId={invoiceId}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormDrawer>
  );
}

function IncomingInvoiceLoader({
  invoiceId,
  onDone,
}: {
  invoiceId: string | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const invoice = useIncomingInvoice(invoiceId);

  if (invoiceId === null) return <IncomingInvoiceForm saved={null} onDone={onDone} />;
  if (invoice.isPending) {
    return (
      <DrawerBody className="flex items-center justify-center">
        <Spinner />
      </DrawerBody>
    );
  }
  if (invoice.isError) {
    return (
      <DrawerBody className="flex flex-col gap-4 pt-6">
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {readableDbError(invoice.error) ?? t('domain:incomingInvoiceForm.loadError')}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => void invoice.refetch()}>{t('common:action.retry')}</Button>
          </MessageBarActions>
        </MessageBar>
      </DrawerBody>
    );
  }
  return <IncomingInvoiceForm saved={invoice.data} onDone={onDone} />;
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

function IncomingInvoiceForm({
  saved,
  onDone,
}: {
  saved: IncomingInvoiceRow | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
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
  const [attached, setAttached] = useState<{ id: string; fileName: string } | null>(null);
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
      setAttached({ id: stored.id, fileName: file.name });
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
      onDone();
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
      onDone();
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

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {saved
            ? t('domain:incomingInvoiceForm.editTitle')
            : t('domain:incomingInvoiceForm.title')}
        </FormDrawerTitle>
        <FormDrawerDescription>
          {editable
            ? t('domain:incomingInvoiceForm.description')
            : t('domain:incomingInvoiceForm.retainedDescription')}
        </FormDrawerDescription>
      </DrawerHeader>

      {/* Ohne shrink-0 drückt die scrollende Spalte Meldungen zusammen, und ihre
          Knöpfe rutschen über das nächste Feld. */}
      <DrawerBody className="flex flex-col gap-4 *:shrink-0">
        {editable && !hasOriginal ? (
          <IncomingInvoiceDropzone busy={uploading} onFile={(file) => void onFile(file)} />
        ) : null}
        {hasOriginal ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <DocumentRegular fontSize={16} />
            {attached
              ? t('domain:incomingInvoiceForm.upload.attachedName', { name: attached.fileName })
              : t('domain:incomingInvoiceForm.upload.attached')}
          </p>
        ) : null}
        {uploadError ? (
          <MessageBar intent="error" layout="multiline">
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
        <ReadMessage read={read} onRetry={(file, kind) => void readEInvoice(file, kind)} />

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

        <div className="grid gap-2">
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

        <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="grid gap-4 sm:grid-cols-3">
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

        <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="grid gap-2">
          <Label htmlFor={ids.notes}>{t('domain:contactForm.notes')}</Label>
          <Textarea
            id={ids.notes}
            rows={3}
            value={notes}
            disabled={!editable}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {error ? (
          <div ref={errorRef}>
            <MessageBar intent="error" layout="multiline">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          </div>
        ) : null}
      </DrawerBody>

      <FormDrawerFooter>
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
        <span className="flex-1" />
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={save.isPending || uploading}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>

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
    </form>
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
