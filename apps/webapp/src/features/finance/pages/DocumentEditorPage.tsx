import {
  formatMoney,
  formatMoneyInput,
  TAX_MODES,
  type TaxMode,
  taxModeNotice,
  todayIso,
  toTaxMode,
} from '@bautakt/finance';
import { DangerIconButton, toast } from '@bautakt/ui';
import {
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
  MessageBarBody,
  MessageBarTitle,
  Select,
  Switch,
  Text,
  Textarea,
  Tooltip,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowDownloadRegular,
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  DeleteRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { DatePicker } from '@/components/form/dateTime';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { ContactPicker } from '@/features/contacts/ContactPicker';
import { useContacts } from '@/features/contacts/useContacts';
import { useOrders } from '@/features/orders/useOrders';
import { readableDbError } from '@/lib/dbErrors';
import { invoiceFromOrderParam, routes } from '@/lib/routes';

import { invalidTermFields, prefillCustomerTerms } from '../customerTerms';
import { EInvoiceBadge } from '../EInvoiceBadge';
import { PdfViewer } from '../PdfViewer';
import {
  buildDraftRows,
  type EditableDocumentType,
  type EditorLine,
  type EditorState,
  editorTotals,
  emptyLine,
  INVOICE_EDITOR_TYPES,
  isBlankLine,
  isInvoiceEditorType,
  LINE_KINDS,
  lineNetMinor,
  loadOrderLines,
  useCompanyTaxProfile,
  useSaveDraft,
} from '../useDocumentEditor';
import { useLivePreview } from '../useLivePreview';
import { useFinalizeDocument, useSalesDocument } from '../useSalesDocument';

function initialState(type: EditableDocumentType, taxMode: TaxMode): EditorState {
  return {
    type,
    customerId: null,
    orderId: null,
    taxMode,
    // Sichtbarer Vorschlag fuer einen neuen Beleg. Ein geladener Entwurf mit
    // leerem issue_date bleibt leer — sonst schreibt Speichern still heute.
    issueDate: todayIso(),
    serviceDate: '',
    dueDate: '',
    introText: '',
    footerText: '',
    notes: '',
    buyerReference: '',
    paymentTermDays: '',
    skontoPercent: '',
    skontoDays: '',
    // Standard ist die E-Rechnung; abwählen nur bewusst im Formular.
    eInvoice: true,
    lines: [emptyLine()],
  };
}

function numberText(value: number | null): string {
  return value == null ? '' : String(value).replace('.', ',');
}

/**
 * Editor fuer Angebote und Rechnungen.
 *
 * Split-Screen (#152): links das Formular in der Reihenfolge des PDFs, rechts
 * das echte PDF aus `finance-document-render`, nach jeder Tipp-Pause neu aus
 * dem ungespeicherten Formular gerendert (`useLivePreview`). Gespeichert wird
 * nur auf Klick: „Entwurf speichern“ oder „Freigeben“; „Abbrechen“ verwirft
 * (Owner 17.10.2026). Die Knöpfe stehen oben und unter dem Formular.
 *
 * ⚠️ Nur Entwuerfe. Festgeschriebene Belege sperrt die Datenbank
 * (`enforce_sales_document_immutability`) — sie hier zum Bearbeiten anzubieten
 * hiesse, dem Nutzer einen Speichern-Knopf zu zeigen, der scheitern muss.
 */
export function DocumentEditorPage({ type }: { type: EditableDocumentType }) {
  const customerFieldId = useId();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dueAlertId = useId();

  const [searchParams] = useSearchParams();
  const fromOrderId = id ? null : searchParams.get(invoiceFromOrderParam);
  const orderFieldId = useId();
  const typeFieldId = useId();
  const taxModeFieldId = useId();

  const { data: membership } = useMembership();
  const existing = useSalesDocument(id);
  const contacts = useContacts();
  const orders = useOrders();
  const taxProfile = useCompanyTaxProfile();
  const save = useSaveDraft();
  const finalize = useFinalizeDocument(id);
  const existingLoading = useCompanyListLoading(existing);

  const [state, setState] = useState<EditorState | null>(null);
  // Gespeicherter Stand als JSON; weicht das Formular ab, gibt es Ungespeichertes.
  const [baseline, setBaseline] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(id ?? null);
  const [busy, setBusy] = useState<'save' | 'release' | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingOrder, setImportingOrder] = useState(false);
  // `?auftrag=` übernimmt die Positionen genau einmal, nicht bei jedem Rendern.
  const pendingOrderImport = useRef<string | null>(null);

  // Kleinunternehmer stellen nie mit Umsatzsteuer aus (§ 19 UStG); die
  // Steuerart steht dann fest, wie in der App.
  const isSmallBusiness = taxProfile.data?.isSmallBusiness ?? false;
  const defaultTaxMode: TaxMode = isSmallBusiness ? 'small_business' : 'standard';

  // Neuer Beleg: erst anlegen, wenn Betrieb und ggf. Auftrag bekannt sind —
  // sonst stünde kurz `standard` statt § 19 im Formular, oder der Kunde fehlte.
  const ordersReady = !fromOrderId || orders.isFetched;
  if (!id && state === null && taxProfile.isFetched && ordersReady) {
    const order = fromOrderId
      ? (orders.data ?? []).find((row) => row.id === fromOrderId)
      : undefined;
    const fresh = initialState(type, defaultTaxMode);
    const start = order ? { ...fresh, orderId: order.id, customerId: order.customer_id } : fresh;
    if (order) pendingOrderImport.current = order.id;
    setState(start);
    setBaseline(JSON.stringify(start));
  }

  // Beim Bearbeiten: sobald der Beleg geladen ist, einmal in den Formularzustand
  // uebernehmen. Danach gehoert der Zustand dem Formular.
  if (id && state === null && existing.data && taxProfile.isFetched) {
    const loaded: EditorState = {
      type: (existing.data.type as EditableDocumentType) ?? type,
      customerId: existing.data.customer_id,
      // Der Auftrag steht an den Positionen, nicht am Kopf. Der Editor schreibt
      // ihn an alle; ein Entwurf aus der App kann gemischte haben, dann gilt
      // der erste.
      orderId: existing.data.lines.find((line) => line.order_id)?.order_id ?? null,
      taxMode: isSmallBusiness ? 'small_business' : toTaxMode(existing.data.tax_mode),
      // NULL nicht durch heute ersetzen. Die Liste sagt dann „Nicht
      // ausgestellt“, und Speichern wuerde das Datum festschreiben.
      // Festschreiben setzt es selbst: coalesce(issue_date, CURRENT_DATE).
      issueDate: existing.data.issue_date ?? '',
      serviceDate: existing.data.service_date ?? '',
      dueDate: existing.data.due_date ?? '',
      introText: existing.data.intro_text,
      footerText: existing.data.footer_text,
      notes: existing.data.notes,
      buyerReference: existing.data.buyer_reference,
      paymentTermDays: numberText(existing.data.payment_term_days),
      skontoPercent: numberText(existing.data.skonto_percent),
      skontoDays: numberText(existing.data.skonto_days),
      eInvoice: existing.data.e_invoice !== false,
      lines: existing.data.lines.length
        ? existing.data.lines.map((line) => ({
            key: line.id,
            title: line.title,
            description: line.description,
            kind: (LINE_KINDS as readonly string[]).includes(line.kind)
              ? (line.kind as EditorLine['kind'])
              : 'other',
            quantity: String(line.quantity),
            unit: line.unit,
            // Ein Nachlass steht negativ in der Datenbank; im Feld ohne Minus.
            unitPrice: formatMoneyInput(
              line.kind === 'discount' ? Math.abs(line.unit_price) : line.unit_price,
            ),
            discountPercent: String(line.discount_percent),
            // Bei § 13b & Co. steht 0 % in der Zeile. Wechselt man zurück auf
            // `standard`, soll der übliche Satz kommen, nicht 0 %.
            taxRatePercent:
              line.tax_rate_percent > 0 || existing.data?.tax_mode === 'standard'
                ? String(line.tax_rate_percent)
                : '19',
            source:
              line.source_type && line.source_id
                ? { type: line.source_type, id: line.source_id }
                : null,
          }))
        : [emptyLine()],
    };
    setState(loaded);
    setBaseline(JSON.stringify(loaded));
  }

  const totals = useMemo(() => (state ? editorTotals(state.lines, state.taxMode) : null), [state]);

  const isLocked = Boolean(id && existing.data && existing.data.status !== 'draft');
  const companyId = membership?.companyId;
  const rows = useMemo(
    () => (state && companyId ? buildDraftRows(state, companyId) : null),
    [state, companyId],
  );
  const live = useLivePreview({ rows, documentId, enabled: state !== null && !isLocked });

  const dirty = state !== null && baseline !== null && JSON.stringify(state) !== baseline;

  // Wegnavigieren mit Ungespeichertem fragt nach. Nach Speichern oder
  // Freigeben geht es ohne Rückfrage weiter (`leavingRef`).
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

  async function importOrderLines(orderId: string) {
    const companyId = membership?.companyId;
    if (!companyId) return;
    setImportingOrder(true);
    try {
      const imported = await loadOrderLines(companyId, orderId, '19');
      // Schon übernommene Zeiten und Material nicht doppelt anhängen.
      const known = new Set(
        (state?.lines ?? []).flatMap((line) => (line.source ? [line.source.id] : [])),
      );
      const fresh = imported.filter((line) => !line.source || !known.has(line.source.id));
      if (fresh.length === 0) {
        toast.info(t('domain:editor.order.nothingToImport'));
        return;
      }
      setState((current) =>
        current
          ? { ...current, lines: [...current.lines.filter((line) => !isBlankLine(line)), ...fresh] }
          : current,
      );
      toast.success(t('domain:editor.order.imported', { count: fresh.length }));
    } catch (error) {
      toast.error(t('domain:editor.order.importError'), {
        description: readableDbError(error) ?? undefined,
      });
    } finally {
      setImportingOrder(false);
    }
  }

  useEffect(() => {
    const orderId = pendingOrderImport.current;
    if (!orderId || !state) return;
    pendingOrderImport.current = null;
    void importOrderLines(orderId);
    // Nur nach dem Anlegen aus `?auftrag=`; importOrderLines liest den Zustand selbst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (id && existingLoading) return <PageSpinner />;

  if (isLocked && id) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:editor.title')} />
        <EmptyState
          title={t('domain:editor.lockedTitle')}
          description={t('domain:editor.lockedDescription')}
          action={<LinkButton to={routes.invoice(id)}>{t('domain:editor.toDocument')}</LinkButton>}
        />
      </div>
    );
  }

  if (!state || !totals) return <PageSpinner />;

  const isInvoice = isInvoiceEditorType(state.type);
  // Beschriftungen unterscheiden nur Angebot und Rechnung, nicht die Rechnungsart.
  const labelType = isInvoice ? 'invoice' : 'quote';

  // Nur bei Rechnungen: Bei Angeboten ist das Fällig-Feld ausgeblendet, ein
  // alter Wert darf das Speichern nicht über ein unsichtbares Feld sperren.
  const dueBeforeIssue = Boolean(
    isInvoice && state.issueDate && state.dueDate && state.dueDate < state.issueDate,
  );

  const invalidTerms = isInvoice ? invalidTermFields(state) : [];

  const customer = (contacts.data ?? []).find((row) => row.id === state.customerId);
  const notice = taxModeNotice(state.taxMode, taxProfile.data?.country);
  // § 13b ohne USt-IdNr. ist nicht verboten (Bauleistung an einen Bauleister
  // geht auch mit Steuernummer), aber meist ein Versehen. Gelesen wird der
  // Kontakt, nicht die alte Kundentabelle.
  const missingBuyerVatId =
    state.taxMode === 'reverse_charge' && Boolean(customer) && !customer?.vat_id?.trim();

  function customerTerms(customerId: string | null) {
    return (contacts.data ?? []).find((row) => row.id === customerId)?.customer_terms ?? null;
  }

  // Auftrag wählen setzt den Kunden des Auftrags, wenn noch keiner gewählt ist.
  // Positionen übernimmt erst der Knopf daneben — ein Wechsel des Auftrags soll
  // nichts Getipptes überschreiben.
  function selectOrder(orderId: string | null) {
    const order = (orders.data ?? []).find((row) => row.id === orderId);
    update({ orderId });
    if (order?.customer_id && !state?.customerId) selectCustomer(order.customer_id);
  }

  // Leitweg-ID, Zahlungsziel und Skonto kommen aus dem Kundenprofil — nur in
  // leere bzw. noch vom vorherigen Kunden vorbelegte Felder (customerTerms.ts).
  function selectCustomer(customerId: string | null) {
    setState((current) =>
      current
        ? {
            ...prefillCustomerTerms(
              current,
              customerTerms(customerId),
              customerTerms(current.customerId),
            ),
            customerId,
          }
        : current,
    );
  }

  function update(patch: Partial<EditorState>) {
    setState((current) => (current ? { ...current, ...patch } : current));
  }

  function updateLine(key: string, patch: Partial<EditorLine>) {
    setState((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
          }
        : current,
    );
  }

  /** Pflichtangaben vor dem Speichern; meldet den ersten Fehler. */
  function validate(): boolean {
    // ⚠️ Das Leistungsdatum ist bei Rechnungen Pflicht: ohne es lehnt
    // `finalize_sales_document` das Festschreiben ab. Lieber hier melden als
    // den Beleg fertig tippen lassen und erst am Ende scheitern.
    if (isInvoice && !state?.serviceDate) {
      setError(t('domain:editor.serviceDateRequired'));
      return false;
    }
    if (dueBeforeIssue) {
      setError(t('domain:editor.dueBeforeIssue'));
      return false;
    }
    if (invalidTerms.length > 0) {
      setError(t('domain:editor.termsInvalid'));
      return false;
    }
    setError(null);
    return true;
  }

  async function persist(): Promise<string> {
    const current = state!;
    const savedId = await save.mutateAsync({ state: current, documentId });
    setDocumentId(savedId);
    setBaseline(JSON.stringify(current));
    return savedId;
  }

  function leaveTo(path: string) {
    leavingRef.current = true;
    void navigate(path);
  }

  const backTo = documentId
    ? routes.invoice(documentId)
    : state.type === 'quote'
      ? routes.quotes
      : routes.invoices;

  async function onSaveDraft() {
    if (!validate()) return;
    setBusy('save');
    try {
      const savedId = await persist();
      toast.success(t('domain:editor.saved'));
      leaveTo(routes.invoice(savedId));
    } catch (error) {
      toast.error(t('domain:editor.saveError'), {
        description: readableDbError(error) ?? undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  function onRelease() {
    if (!validate()) return;
    setConfirmRelease(true);
  }

  async function onConfirmRelease() {
    setConfirmRelease(false);
    setBusy('release');
    let savedId: string | null = null;
    try {
      savedId = await persist();
      const { archived } = await finalize.mutateAsync(savedId);
      if (archived) toast.success(t('domain:invoices.finalizeSuccess'));
      else toast.warning(t('domain:invoices.archive.finalizedWithoutArchive'));
      leaveTo(routes.invoice(savedId));
    } catch (error) {
      // Gespeichert ist der Entwurf dann schon; die Datenbank sagt, was fehlt.
      toast.error(savedId ? t('domain:invoices.finalizeError') : t('domain:editor.saveError'), {
        description: readableDbError(error) ?? undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  function onCancel() {
    if (dirty) setConfirmDiscard(true);
    else leaveTo(backTo);
  }

  function onDiscardConfirmed() {
    setConfirmDiscard(false);
    if (blocker.state === 'blocked') blocker.proceed();
    else leaveTo(backTo);
  }

  function onDiscardKept() {
    setConfirmDiscard(false);
    if (blocker.state === 'blocked') blocker.reset();
  }

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button disabled={busy !== null} onClick={onCancel}>
        {t('common:action.cancel')}
      </Button>
      <Button
        icon={<SaveRegular />}
        disabled={busy !== null || dueBeforeIssue}
        onClick={() => void onSaveDraft()}
      >
        {t('domain:editor.actions.saveDraft')}
      </Button>
      <Button
        appearance="primary"
        icon={<CheckmarkCircleRegular />}
        disabled={busy !== null || dueBeforeIssue}
        onClick={onRelease}
      >
        {t('domain:editor.actions.release')}
      </Button>
    </div>
  );

  const previewError = live.error
    ? (readableDbError(live.error) ?? t('domain:editor.preview.error'))
    : null;
  const statusText =
    busy !== null
      ? t('domain:editor.preview.saving')
      : dirty || !documentId
        ? t('domain:editor.preview.notSaved')
        : t('domain:editor.preview.saved');
  const discardOpen = confirmDiscard || blocker.state === 'blocked';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={id ? t('domain:editor.editTitle') : t(`domain:editor.newTitle.${labelType}`)}
        description={t('domain:editor.draftHint')}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Text size={200} className="text-muted-foreground" aria-live="polite">
              {statusText}
            </Text>
            {actions}
          </div>
        }
      />

      {error ? (
        <MessageBar intent="error" role="alert">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      {/* Split-Screen: links das Formular in der Reihenfolge des PDFs, rechts
          das PDF selbst. Unter xl untereinander, die Vorschau unten. Die Raster im
          Formular richten sich nach der Spaltenbreite (`@container`), nicht nach
          dem Fenster: neben dem PDF ist die Spalte auf dem Laptop schmal. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="@container flex min-w-0 flex-col gap-4">
          <Section title={t('domain:editor.sections.document')}>
            <div className="grid gap-4 @lg:grid-cols-2">
              {isInvoice ? (
                <div className="grid gap-2">
                  <Label htmlFor={typeFieldId}>{t('domain:editor.documentType')}</Label>
                  <Select
                    id={typeFieldId}
                    value={state.type}
                    onChange={(_, { value }) => update({ type: value as EditableDocumentType })}
                  >
                    {INVOICE_EDITOR_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {t(`domain:editor.documentTypes.${value}`)}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor={orderFieldId}>{t('domain:editor.order.label')}</Label>
                <div className="flex gap-2">
                  <Select
                    id={orderFieldId}
                    className="min-w-0 flex-1"
                    value={state.orderId ?? ''}
                    onChange={(_, { value }) => selectOrder(value || null)}
                  >
                    <option value="">{t('domain:editor.order.none')}</option>
                    {(orders.data ?? []).map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.customer_label
                          ? `${order.name} · ${order.customer_label}`
                          : order.name}
                      </option>
                    ))}
                  </Select>
                  {state.orderId ? (
                    <Tooltip content={t('domain:editor.order.import')} relationship="label">
                      <Button
                        icon={<ArrowDownloadRegular />}
                        disabled={importingOrder}
                        onClick={() => state.orderId && void importOrderLines(state.orderId)}
                      />
                    </Tooltip>
                  ) : null}
                </div>
              </div>
              {isInvoice ? (
                <div className="grid gap-1 @lg:col-span-2">
                  <Switch
                    checked={state.eInvoice}
                    onChange={(_, data) => update({ eInvoice: data.checked })}
                    label={
                      <span className="inline-flex items-center gap-2">
                        {t('domain:eInvoice.switchLabel')}
                        {state.eInvoice ? <EInvoiceBadge /> : null}
                      </span>
                    }
                  />
                  <p className="text-muted-foreground text-sm">
                    {state.eInvoice ? t('domain:eInvoice.onHint') : t('domain:eInvoice.offHint')}
                  </p>
                </div>
              ) : null}
            </div>
          </Section>

          <Section title={t('domain:editor.sections.recipient')}>
            <div className="grid gap-4 @lg:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={customerFieldId}>{t('domain:invoices.columns.customer')}</Label>
                <ContactPicker
                  id={customerFieldId}
                  contactRole="customer"
                  value={state.customerId}
                  onChange={(contact) => selectCustomer(contact?.id ?? null)}
                  allowNone
                  noneLabel={t('domain:invoices.noCustomer')}
                />
              </div>
              {isInvoice ? (
                <Field
                  label={t('domain:invoices.buyerReference')}
                  value={state.buyerReference}
                  onChange={(value) => update({ buyerReference: value })}
                />
              ) : null}
            </div>
          </Section>

          <Section title={t('domain:editor.sections.dates')}>
            <div className="grid gap-4 @2xl:grid-cols-3">
              {/* Ueber den Feldern: der Kalender oeffnet nach unten und wuerde
                  die Meldung direkt unter dem Faellig-Feld verdecken. */}
              {dueBeforeIssue ? (
                <p
                  id={dueAlertId}
                  role="alert"
                  className="text-destructive text-sm @2xl:col-span-3"
                >
                  {t('domain:editor.dueBeforeIssue')}
                </p>
              ) : null}
              <DateField
                label={t(`domain:editor.issueDateLabel.${labelType}`)}
                value={state.issueDate}
                onChange={(value) => update({ issueDate: value })}
                placeholder={t('domain:editor.issueDatePlaceholder')}
                hint={state.issueDate ? undefined : t('domain:editor.issueDateEmptyHint')}
              />
              {/* Angebote: kein Leistungsdatum (keine Pflichtangabe, die App zeigt
                  es dort auch nicht) und kein Fällig-Feld. `due_date` druckt der
                  PDF-Renderer immer als „Zahlbar bis“ — als „Gültig bis“
                  beschriftet, stünde die Gültigkeit als Zahlungsziel im Angebot.
                  Ein eigenes Gültigkeitsfeld braucht Schema und Renderer (#86). */}
              {isInvoice ? (
                <>
                  <DateField
                    label={t('domain:editor.serviceDateRequiredLabel')}
                    value={state.serviceDate}
                    onChange={(value) => update({ serviceDate: value })}
                  />
                  <DateField
                    label={t('domain:editor.dueDateLabel')}
                    value={state.dueDate}
                    onChange={(value) => update({ dueDate: value })}
                    describedBy={dueBeforeIssue ? dueAlertId : undefined}
                    invalid={dueBeforeIssue}
                    hint={
                      !state.dueDate && state.paymentTermDays.trim()
                        ? t('domain:editor.dueFromTerm', {
                            count: Number(state.paymentTermDays) || 0,
                          })
                        : undefined
                    }
                  />
                </>
              ) : null}
            </div>
          </Section>

          <Section title={t('domain:editor.intro')}>
            <Textarea
              aria-label={t('domain:editor.intro')}
              rows={3}
              value={state.introText}
              onChange={(event) => update({ introText: event.target.value })}
            />
          </Section>

          <Section title={t('domain:invoices.lines')}>
            <div className="flex flex-col gap-3">
              {state.lines.map((line) => (
                <div
                  key={line.key}
                  className="border-border grid gap-3 rounded-lg border p-3 @xl:grid-cols-6"
                >
                  <div className="@xl:col-span-4">
                    <Field
                      label={t('domain:invoices.lineColumns.title')}
                      value={line.title}
                      onChange={(value) => updateLine(line.key, { title: value })}
                    />
                  </div>
                  <div className="grid gap-2 @xl:col-span-2">
                    <Label htmlFor={`line-${line.key}-kind`}>{t('domain:editor.kind')}</Label>
                    <Select
                      id={`line-${line.key}-kind`}
                      value={line.kind}
                      onChange={(_, { value }) =>
                        updateLine(line.key, { kind: value as EditorLine['kind'] })
                      }
                    >
                      {LINE_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {t(`domain:editor.kinds.${kind}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Field
                    label={t('domain:invoices.lineColumns.quantity')}
                    value={line.quantity}
                    onChange={(value) => updateLine(line.key, { quantity: value })}
                    numeric
                  />
                  <Field
                    label={t('domain:editor.unit')}
                    value={line.unit}
                    onChange={(value) => updateLine(line.key, { unit: value })}
                  />
                  <Field
                    label={t('domain:invoices.lineColumns.unitPrice')}
                    value={line.unitPrice}
                    onChange={(value) => updateLine(line.key, { unitPrice: value })}
                    numeric
                  />
                  <Field
                    label={t('domain:editor.discount')}
                    value={line.discountPercent}
                    onChange={(value) => updateLine(line.key, { discountPercent: value })}
                    numeric
                  />
                  <div className="grid gap-2">
                    <Label>{t('domain:invoices.lineColumns.net')}</Label>
                    <span className="text-foreground flex h-9 items-center justify-end text-sm font-medium tabular-nums">
                      {line.kind === 'text' ? '—' : formatMoney(lineNetMinor(line))}
                    </span>
                  </div>
                  <div className="flex items-end justify-end">
                    <DangerIconButton
                      aria-label={t('domain:editor.removeLine')}
                      disabled={state.lines.length === 1}
                      onClick={() =>
                        update({ lines: state.lines.filter((entry) => entry.key !== line.key) })
                      }
                      icon={<DeleteRegular />}
                    />
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap items-start justify-between gap-4">
                <Button
                  onClick={() => update({ lines: [...state.lines, emptyLine()] })}
                  icon={<AddRegular />}
                >
                  {t('domain:editor.addLine')}
                </Button>

                <dl className="flex w-full max-w-xs flex-col gap-1 text-sm">
                  <SumRow label={t('domain:invoices.net')} value={formatMoney(totals.netMinor)} />
                  {/* Ohne Umsatzsteuer gibt es keine 0-%-Zeile: der Hinweis unten sagt warum. */}
                  {totals.byRate
                    .filter((group) => state.taxMode === 'standard' || group.vatMinor !== 0)
                    .map((group) => (
                      <SumRow
                        key={group.rate}
                        label={t('domain:invoices.vatAt', { rate: group.rate })}
                        value={formatMoney(group.vatMinor)}
                      />
                    ))}
                  <SumRow
                    label={t('domain:invoices.gross')}
                    value={formatMoney(totals.grossMinor)}
                    strong
                  />
                </dl>
              </div>
            </div>
          </Section>

          <Section title={t('domain:editor.taxMode.label')}>
            <div className="flex flex-col gap-3">
              <div className="grid gap-2 @lg:max-w-sm">
                <Label htmlFor={taxModeFieldId} className="sr-only">
                  {t('domain:editor.taxMode.label')}
                </Label>
                <Select
                  id={taxModeFieldId}
                  value={state.taxMode}
                  disabled={isSmallBusiness}
                  onChange={(_, { value }) => update({ taxMode: value as TaxMode })}
                >
                  {TAX_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {t(`domain:editor.taxMode.modes.${mode}`)}
                    </option>
                  ))}
                </Select>
                {isSmallBusiness ? (
                  <p className="text-muted-foreground text-sm">
                    {t('domain:editor.taxMode.smallBusinessLocked')}
                  </p>
                ) : null}
              </div>
              {notice ? (
                <MessageBar intent="info">
                  <MessageBarBody>
                    <MessageBarTitle>{t('domain:editor.taxMode.noticeTitle')}</MessageBarTitle>
                    {notice}
                  </MessageBarBody>
                </MessageBar>
              ) : null}
              {missingBuyerVatId ? (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    <MessageBarTitle>
                      {t('domain:editor.taxMode.missingVatIdTitle')}
                    </MessageBarTitle>
                    {t('domain:editor.taxMode.missingVatIdDescription')}
                  </MessageBarBody>
                </MessageBar>
              ) : null}
            </div>
          </Section>

          {isInvoice ? (
            <Section title={t('domain:editor.sections.payment')}>
              <div className="grid gap-4 @2xl:grid-cols-3">
                <Field
                  label={t('domain:editor.paymentTermDays')}
                  value={state.paymentTermDays}
                  onChange={(value) => update({ paymentTermDays: value })}
                  numeric
                  invalid={invalidTerms.includes('paymentTermDays')}
                />
                <Field
                  label={t('domain:editor.skontoPercent')}
                  value={state.skontoPercent}
                  onChange={(value) => update({ skontoPercent: value })}
                  numeric
                  invalid={invalidTerms.includes('skontoPercent')}
                />
                <Field
                  label={t('domain:editor.skontoDays')}
                  value={state.skontoDays}
                  onChange={(value) => update({ skontoDays: value })}
                  numeric
                  invalid={invalidTerms.includes('skontoDays')}
                />
              </div>
            </Section>
          ) : null}

          <Section title={t('domain:editor.footer')}>
            <Textarea
              aria-label={t('domain:editor.footer')}
              rows={3}
              value={state.footerText}
              onChange={(event) => update({ footerText: event.target.value })}
            />
          </Section>

          {/* Dieselben Knöpfe wie oben: wer unten fertig ist, muss nicht hochscrollen. */}
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <Text size={200} className="text-muted-foreground">
              {statusText}
            </Text>
            {actions}
          </div>
        </div>

        {/* Vorschau bleibt beim Scrollen des Formulars stehen. */}
        <aside
          aria-label={t('domain:editor.preview.title')}
          className="flex h-[80vh] min-h-0 flex-col gap-3 xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]"
        >
          <PdfViewer
            data={live.pdf}
            loading={live.phase !== 'idle'}
            error={previewError}
            emptyText={t('domain:editor.preview.empty')}
            toolbarEnd={
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowSyncRegular />}
                disabled={live.phase !== 'idle'}
                onClick={() => live.refresh()}
              >
                {t('domain:editor.preview.refresh')}
              </Button>
            }
          />
          {live.warnings.length > 0 ? (
            // Nicht schrumpfen: sonst ragt die Liste über den Rahmen hinaus.
            // Lange Listen scrollen, damit das PDF sichtbar bleibt.
            <MessageBar intent="warning" layout="multiline" className="shrink-0">
              <MessageBarBody className="max-h-48 overflow-y-auto">
                <MessageBarTitle>
                  {isInvoice && state.eInvoice
                    ? t('domain:editor.preview.warningsTitle')
                    : t('domain:editor.preview.warningsTitlePlain')}
                </MessageBarTitle>
                <ul className="mt-1 list-disc pl-5">
                  {live.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </MessageBarBody>
            </MessageBar>
          ) : null}
        </aside>
      </div>

      <Dialog open={confirmRelease} onOpenChange={(_, data) => setConfirmRelease(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t(`domain:editor.release.title.${labelType}`)}</DialogTitle>
            <DialogContent>{t('domain:editor.release.description')}</DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmRelease(false)}>{t('common:action.cancel')}</Button>
              <Button appearance="primary" onClick={() => void onConfirmRelease()}>
                {t('domain:editor.actions.release')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={(_, data) => !data.open && onDiscardKept()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('domain:editor.discard.title')}</DialogTitle>
            <DialogContent>{t('domain:editor.discard.description')}</DialogContent>
            <DialogActions>
              <Button onClick={onDiscardKept}>{t('domain:editor.discard.keep')}</Button>
              <Button appearance="primary" onClick={onDiscardConfirmed}>
                {t('domain:editor.discard.confirm')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

/** Abschnitt des Formulars; Reihenfolge und Titel folgen dem PDF. */
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

function Field({
  label,
  value,
  onChange,
  numeric,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  invalid?: boolean;
}) {
  const fieldId = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        input={numeric ? { className: 'text-right tabular-nums' } : undefined}
        inputMode={numeric ? 'decimal' : undefined}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  describedBy,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const id = useId();
  const hintId = useId();
  const described = [describedBy, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      <DatePicker
        id={id}
        aria-label={label}
        aria-describedby={described}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SumRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? 'text-foreground font-medium' : 'text-muted-foreground'}>{label}</dt>
      <dd className={strong ? 'font-semibold tabular-nums' : 'tabular-nums'}>{value}</dd>
    </div>
  );
}
