import { type InvoiceTemplateRow, templateTextsFor } from '@bautakt/document-render';
import {
  eurosToMinor,
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
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Select,
  Switch,
  Text,
  Textarea,
  ToggleButton,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowDownloadRegular,
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  DeleteRegular,
  ReceiptMoneyRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { HelpButton } from '@/components/common/HelpButton';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { DatePicker } from '@/components/form/dateTime';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { ContactPicker } from '@/features/contacts/ContactPicker';
import { useContacts } from '@/features/contacts/useContacts';
import { useOrders } from '@/features/orders/useOrders';
import { useInvoiceTemplates } from '@/features/settings/invoiceTemplates';
import { readableDbError } from '@/lib/dbErrors';
import { creditNoteFromParam, invoiceFromOrderParam, routes } from '@/lib/routes';

import { invalidTermFields, prefillCustomerTerms } from '../customerTerms';
import { PdfViewer } from '../PdfViewer';
import { ReleaseDialog } from '../ReleaseDialog';
import {
  buildDraftRows,
  BUYER_REFERENCE_MAX_LENGTH,
  E_INVOICE_FORMATS,
  type EditableDocumentType,
  type EditorLine,
  type EditorState,
  editorTotals,
  emptyLine,
  INVOICE_EDITOR_TYPES,
  isBlankLine,
  isDeduction,
  isInvoiceDocument,
  isInvoiceEditorType,
  LINE_KINDS,
  lineNetMinor,
  loadOrderLines,
  loadPartialCredits,
  storedSign,
  toEInvoiceFormat,
  useCompanyTaxProfile,
  useSaveDraft,
} from '../useDocumentEditor';
import { useLivePreview } from '../useLivePreview';
import {
  chargeableMinorOf,
  type DocumentLine,
  PreviewMismatchError,
  type SalesDocumentDetail,
  useFinalizeDocument,
  useSalesDocument,
} from '../useSalesDocument';

function initialState(type: EditableDocumentType, taxMode: TaxMode): EditorState {
  return {
    type,
    parentDocumentId: null,
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
    subject: '',
    invoiceTemplateId: null,
    buyerReference: '',
    paymentTermDays: '',
    skontoPercent: '',
    skontoDays: '',
    // Standard ist die E-Rechnung; abwählen nur bewusst im Formular.
    eInvoice: true,
    eInvoiceFormat: 'zugferd',
    lines: [emptyLine()],
  };
}

/**
 * Vorlage am Beleg setzen und ihre Texte für die Belegart vorbelegen.
 * Einleitung und Schlusstext werden nur ersetzt, wenn sie leer sind oder noch
 * genau dem Text der bisherigen Vorlage entsprechen — Eigenes bleibt stehen.
 */
function withTemplate(
  state: EditorState,
  from: InvoiceTemplateRow | null,
  to: InvoiceTemplateRow | null,
  fromType: string = state.type,
): EditorState {
  const before = templateTextsFor(from, fromType);
  const after = templateTextsFor(to, state.type);
  const replace = (current: string, previous: string, next: string) =>
    !current.trim() || current.trim() === previous ? next : current;
  return {
    ...state,
    invoiceTemplateId: to?.id ?? null,
    introText: replace(state.introText, before.intro, after.intro),
    footerText: replace(state.footerText, before.footer, after.footer),
  };
}

function numberText(value: number | null): string {
  return value == null ? '' : String(value).replace('.', ',');
}

/**
 * Positionen aus der Datenbank fürs Formular. `type` ist die Belegart, aus
 * der die Zeilen stammen: Eine Gutschrift liegt negiert vor und wird positiv
 * gezeigt. Neue Zeilen-Keys, wenn die Zeilen in einen neuen Beleg wandern.
 */
function toEditorLines(
  lines: DocumentLine[],
  type: string,
  taxMode: string,
  freshKeys = false,
): EditorLine[] {
  const sign = storedSign(type);
  return lines.map((line) => {
    const price = sign * line.unit_price;
    return {
      key: freshKeys ? crypto.randomUUID() : line.id,
      title: line.title,
      description: line.description,
      kind:
        (LINE_KINDS as readonly string[]).includes(line.kind) || line.kind === 'partial_credit'
          ? (line.kind as EditorLine['kind'])
          : 'other',
      quantity: String(line.quantity),
      unit: line.unit,
      // Ein Nachlass oder Abzug steht negativ in der Datenbank; im Feld ohne Minus.
      unitPrice: formatMoneyInput(isDeduction(line.kind) ? Math.abs(price) : price),
      discountPercent: String(line.discount_percent),
      // Bei § 13b & Co. steht 0 % in der Zeile. Wechselt man zurück auf
      // `standard`, soll der übliche Satz kommen, nicht 0 %.
      taxRatePercent:
        line.tax_rate_percent > 0 || taxMode === 'standard' ? String(line.tax_rate_percent) : '19',
      // Eine Gutschrift rechnet Zeit und Material nicht noch einmal ab.
      source:
        !freshKeys && line.source_type && line.source_id
          ? { type: line.source_type, id: line.source_id }
          : null,
      creditedDocumentId: line.credited_document_id,
    };
  });
}

/**
 * Gutschrift-Entwurf zu einer Rechnung: Kunde, Steuerart, Käuferreferenz und
 * Leistungsdatum vom Original, die Positionen als Vorlage. Der Nutzer streicht
 * oder ändert, was nicht gutgeschrieben wird.
 *
 * Abschlagsabzüge einer Schlussrechnung kommen als Nachlass mit: Die Vorlage
 * ergibt dann genau den Betrag der Schlussrechnung, also das, was noch
 * gutgeschrieben werden kann (#215). Als `partial_credit` gingen sie nicht,
 * der Abschlag ist schon in der Schlussrechnung verrechnet.
 */
function creditNoteState(original: SalesDocumentDetail, taxMode: TaxMode): EditorState {
  const lines = toEditorLines(original.lines, original.type, original.tax_mode, true).map(
    (line) => ({
      ...line,
      kind: line.kind === 'partial_credit' ? ('discount' as const) : line.kind,
      creditedDocumentId: null,
    }),
  );
  return {
    ...initialState('credit_note', taxMode),
    parentDocumentId: original.id,
    customerId: original.customer_id,
    orderId: original.lines.find((line) => line.order_id)?.order_id ?? null,
    serviceDate: original.service_date ?? '',
    buyerReference: original.buyer_reference,
    eInvoice: original.e_invoice !== false,
    eInvoiceFormat: toEInvoiceFormat(original.einvoice_format),
    lines: lines.length ? lines : [emptyLine()],
  };
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
const useStyles = makeStyles({
  // Gewähltes Format im Blau des E-Rechnung-Schalters daneben, nicht im
  // etwas dunkleren Blau des Primary-Buttons.
  formatSelected: {
    backgroundColor: tokens.colorCompoundBrandBackground,
    ':hover': { backgroundColor: tokens.colorCompoundBrandBackgroundHover },
    ':hover:active': { backgroundColor: tokens.colorCompoundBrandBackgroundPressed },
  },
});

export function DocumentEditorPage({ type }: { type: EditableDocumentType }) {
  const customerFieldId = useId();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dueAlertId = useId();

  const [searchParams] = useSearchParams();
  const fromOrderId = id ? null : searchParams.get(invoiceFromOrderParam);
  const creditFromId = id ? null : searchParams.get(creditNoteFromParam);
  const orderFieldId = useId();
  const styles = useStyles();
  const typeFieldId = useId();
  const templateFieldId = useId();
  const subjectFieldId = useId();
  const taxModeFieldId = useId();

  const { data: membership } = useMembership();
  const existing = useSalesDocument(id);
  // Ursprungsrechnung einer Gutschrift: Vorlage beim Anlegen, Obergrenze beim Freigeben.
  const parentId =
    creditFromId ??
    (existing.data?.type === 'credit_note' ? (existing.data.parent?.id ?? undefined) : undefined);
  const parentDocument = useSalesDocument(parentId ?? undefined);
  const contacts = useContacts();
  const orders = useOrders();
  const taxProfile = useCompanyTaxProfile();
  const templates = useInvoiceTemplates();
  const activeTemplates = (templates.data ?? []).filter((row) => !row.archived_at);
  const defaultTemplate = activeTemplates.find((row) => row.is_default);
  const templateById = (templateId: string | null) =>
    (templates.data ?? []).find((row) => row.id === templateId) ?? null;
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
  const parentReady = !creditFromId || parentDocument.isFetched;
  // Vorlagen: Fehler (etwa ohne Leserecht) heißt nur „keine Vorlage“.
  const templatesReady = !templates.isLoading;
  if (
    !id &&
    state === null &&
    taxProfile.isFetched &&
    ordersReady &&
    parentReady &&
    templatesReady
  ) {
    const order = fromOrderId
      ? (orders.data ?? []).find((row) => row.id === fromOrderId)
      : undefined;
    const fresh = parentDocument.data
      ? creditNoteState(
          parentDocument.data,
          isSmallBusiness ? 'small_business' : toTaxMode(parentDocument.data.tax_mode),
        )
      : initialState(type, defaultTaxMode);
    const ordered = order ? { ...fresh, orderId: order.id, customerId: order.customer_id } : fresh;
    // Standardvorlage samt ihrer Texte für diese Belegart vorbelegen.
    const start = withTemplate(ordered, null, defaultTemplate ?? null);
    if (order) pendingOrderImport.current = order.id;
    setState(start);
    setBaseline(JSON.stringify(start));
  }

  // Beim Bearbeiten: sobald der Beleg geladen ist, einmal in den Formularzustand
  // uebernehmen. Danach gehoert der Zustand dem Formular.
  if (id && state === null && existing.data && taxProfile.isFetched) {
    const loaded: EditorState = {
      type: (existing.data.type as EditableDocumentType) ?? type,
      parentDocumentId: existing.data.parent?.id ?? null,
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
      subject: existing.data.subject ?? '',
      invoiceTemplateId: existing.data.invoice_template_id ?? null,
      buyerReference: existing.data.buyer_reference,
      paymentTermDays: numberText(existing.data.payment_term_days),
      skontoPercent: numberText(existing.data.skonto_percent),
      skontoDays: numberText(existing.data.skonto_days),
      eInvoice: existing.data.e_invoice !== false,
      eInvoiceFormat: toEInvoiceFormat(existing.data.einvoice_format),
      lines: existing.data.lines.length
        ? toEditorLines(existing.data.lines, existing.data.type, existing.data.tax_mode)
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
      } else {
        setState((current) =>
          current
            ? {
                ...current,
                lines: [...current.lines.filter((line) => !isBlankLine(line)), ...fresh],
              }
            : current,
        );
        toast.success(t('domain:editor.order.imported', { count: fresh.length }));
      }
      // Die Schlussrechnung zieht die Abschläge des Auftrags gleich mit ab.
      if (state?.type === 'final_invoice') await applyPartialCredits(orderId);
    } catch (error) {
      toast.error(t('domain:editor.order.importError'), {
        description: readableDbError(error) ?? undefined,
      });
    } finally {
      setImportingOrder(false);
    }
  }

  /** Abzüge neu aufbauen: alte Abzugszeilen raus, aktuelle Abschläge ans Ende. */
  async function applyPartialCredits(orderId: string) {
    const companyId = membership?.companyId;
    if (!companyId) return;
    setImportingOrder(true);
    try {
      const credits = await loadPartialCredits(companyId, orderId, documentId);
      setState((current) =>
        current
          ? {
              ...current,
              lines: [
                ...current.lines.filter(
                  (line) => line.kind !== 'partial_credit' && !isBlankLine(line),
                ),
                ...credits,
              ],
            }
          : current,
      );
      if (credits.length === 0) toast.info(t('domain:editor.partialCredits.none'));
      else toast.success(t('domain:editor.partialCredits.applied', { count: credits.length }));
    } catch (error) {
      toast.error(t('domain:editor.partialCredits.error'), {
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

  const isInvoice = isInvoiceDocument(state.type);
  const isCreditNote = state.type === 'credit_note';
  // Noch gutschreibbar: Brutto der Rechnung minus freigegebene Gutschriften.
  const creditLimitMinor = parentDocument.data ? chargeableMinorOf(parentDocument.data) : null;
  const creditedMinor = parentDocument.data ? eurosToMinor(parentDocument.data.credited_total) : 0;
  // Schon in der Vorlage sichtbar, nicht erst beim Freigeben (#215): Nach einer
  // Teilgutschrift liegen die übernommenen Positionen über dem Rest.
  const creditExcessMinor =
    isCreditNote && creditLimitMinor !== null
      ? Math.max(0, totals.grossMinor - creditLimitMinor)
      : 0;
  const buyerReferenceTooLong = state.buyerReference.trim().length > BUYER_REFERENCE_MAX_LENGTH;
  const isXRechnung = isInvoice && state.eInvoice && state.eInvoiceFormat === 'xrechnung';
  const leitwegMissing = isXRechnung && !state.buyerReference.trim();
  // Beschriftungen unterscheiden nur Angebot und Rechnung, nicht die Rechnungsart.
  const labelType = isInvoice ? 'invoice' : 'quote';
  // Gutschriften erben E-Rechnung und Format der Rechnung (DB-Trigger), dort
  // gibt es nichts zu wählen.
  const showEInvoiceToggle = isInvoice && !isCreditNote;
  const newTitleKey = isCreditNote
    ? 'credit_note'
    : isInvoice && state.eInvoice
      ? 'e_invoice'
      : labelType;

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

  /** Vorlage wechseln; unveränderte Vorlagentexte wandern mit (`withTemplate`). */
  function selectTemplate(templateId: string | null) {
    setState((current) =>
      current
        ? withTemplate(current, templateById(current.invoiceTemplateId), templateById(templateId))
        : current,
    );
  }

  // Die letzte Position darf weg; dann steht eine leere zum Neuanfangen da.
  function removeLine(key: string) {
    setState((current) => {
      if (!current) return current;
      const rest = current.lines.filter((entry) => entry.key !== key);
      return { ...current, lines: rest.length ? rest : [emptyLine()] };
    });
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

  /**
   * Pflichtangaben vor dem Freigeben; meldet den ersten Fehler. Ein Entwurf
   * lässt sich dagegen immer speichern, auch halb ausgefüllt (Owner 17.10.2026).
   */
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
    if (!state?.lines.some((line) => line.title.trim())) {
      setError(t('domain:invoices.noLines'));
      return false;
    }
    if (buyerReferenceTooLong) {
      setError(t('domain:editor.buyerReferenceTooLong', { max: BUYER_REFERENCE_MAX_LENGTH }));
      return false;
    }
    // BR-DE-15; die Datenbank sperrt dasselbe (XRECHNUNG_BUYER_REFERENCE).
    if (leitwegMissing) {
      setError(t('domain:eInvoice.leitwegRequired'));
      return false;
    }
    if (isCreditNote && totals) {
      if (totals.grossMinor <= 0) {
        setError(t('domain:editor.creditNote.noAmount'));
        return false;
      }
      if (creditLimitMinor !== null && totals.grossMinor > creditLimitMinor) {
        setError(t('domain:editor.creditNote.exceeds', { amount: formatMoney(creditLimitMinor) }));
        return false;
      }
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
    : state.parentDocumentId
      ? routes.invoice(state.parentDocumentId)
      : state.type === 'quote'
        ? routes.quotes
        : routes.financeHub;

  async function onSaveDraft() {
    setError(null);
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
    // Steht noch eine Tipp-Pause aus, gleich rendern statt zu warten (#217).
    live.flush();
    setConfirmRelease(true);
  }

  async function onConfirmRelease(sendAfter: boolean) {
    // Der Dialog lässt nur mit aktueller Vorschau bestätigen.
    const expectedFingerprint = live.fingerprint;
    if (!expectedFingerprint) {
      // Nie still abbrechen: der Dialog sollte das schon verhindert haben.
      toast.error(t('domain:editor.release.previewFailed'));
      return;
    }
    setBusy('release');
    let savedId: string | null = null;
    try {
      savedId = await persist();
      const { archived, documentNumber, archiveError, matchesPreview } = await finalize.mutateAsync(
        { savedId, expectedFingerprint },
      );
      if (!archived)
        toast.warning(
          t('domain:invoices.archive.finalizedWithoutArchive', { number: documentNumber }),
          { description: archiveError ?? undefined },
        );
      else if (matchesPreview === false)
        toast.warning(t('domain:editor.release.originalDiffersTitle', { number: documentNumber }), {
          description: t('domain:editor.release.originalDiffersDescription'),
        });
      else toast.success(t('domain:invoices.finalizeSuccess', { number: documentNumber }));
      // Ohne Archiv-Original gibt es nichts zu versenden; die Warnung steht oben.
      leaveTo(sendAfter && archived ? routes.invoiceSend(savedId) : routes.invoice(savedId));
    } catch (error) {
      setConfirmRelease(false);
      if (error instanceof PreviewMismatchError && savedId) {
        // Nichts festgeschrieben. Gezeigt wird jetzt, was festgeschrieben würde.
        void live.showSaved(savedId);
        toast.warning(t('domain:editor.release.mismatchTitle'), {
          description: t('domain:editor.release.mismatchDescription'),
        });
        return;
      }
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
      <Button icon={<SaveRegular />} disabled={busy !== null} onClick={() => void onSaveDraft()}>
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

  // Aktuell, aber ohne Fingerabdruck: Vorschau taugt nicht als Freigabe-Grundlage.
  const releasePreview = live.current
    ? live.fingerprint
      ? 'ready'
      : 'failed'
    : live.error && live.phase === 'idle'
      ? 'failed'
      : 'pending';
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
        title={id ? t('domain:editor.editTitle') : t(`domain:editor.newTitle.${newTitleKey}`)}
        titleAddon={
          showEInvoiceToggle ? (
            <div className="flex flex-wrap items-center gap-3">
              <Switch
                checked={state.eInvoice}
                onChange={(_, data) => update({ eInvoice: data.checked })}
                label={t('domain:eInvoice.formatLabel')}
              />
              {/* Format nur bei eingeschalteter E-Rechnung; fast immer ZUGFeRD (#184). */}
              {state.eInvoice ? (
                <div
                  role="group"
                  aria-label={t('domain:eInvoice.formatGroupLabel')}
                  className="bg-muted border-border flex items-center gap-0.5 rounded-full border p-0.5"
                >
                  {E_INVOICE_FORMATS.map((format) => (
                    <ToggleButton
                      key={format}
                      size="small"
                      shape="circular"
                      appearance={state.eInvoiceFormat === format ? 'primary' : 'subtle'}
                      checked={state.eInvoiceFormat === format}
                      className={
                        state.eInvoiceFormat === format ? styles.formatSelected : undefined
                      }
                      onClick={() => update({ eInvoiceFormat: format })}
                    >
                      {t(`domain:eInvoice.formats.${format}`)}
                    </ToggleButton>
                  ))}
                </div>
              ) : null}
              <HelpButton label={t('domain:eInvoice.formatLabel')}>
                <p>
                  <strong>{t('domain:eInvoice.formats.zugferd')}:</strong>{' '}
                  {t('domain:eInvoice.onHint')}
                </p>
                <p>
                  <strong>{t('domain:eInvoice.formats.xrechnung')}:</strong>{' '}
                  {t('domain:eInvoice.xrechnungHint')}
                </p>
                <p>
                  <strong>{t('domain:eInvoice.offLabel')}</strong> {t('domain:eInvoice.offHint')}
                </p>
              </HelpButton>
            </div>
          ) : null
        }
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
              {isCreditNote && parentDocument.data ? (
                <MessageBar
                  intent={creditExcessMinor > 0 ? 'warning' : 'info'}
                  className="@lg:col-span-2"
                >
                  <MessageBarBody>
                    {t('domain:editor.creditNote.info', {
                      number: parentDocument.data.document_number ?? '',
                      amount: formatMoney(creditLimitMinor ?? 0),
                    })}
                    {creditedMinor > 0
                      ? ` ${t('domain:editor.creditNote.alreadyCredited', { amount: formatMoney(creditedMinor) })}`
                      : null}
                    {creditExcessMinor > 0
                      ? ` ${t('domain:editor.creditNote.reduceBy', { amount: formatMoney(creditExcessMinor) })}`
                      : null}
                  </MessageBarBody>
                </MessageBar>
              ) : null}
              {isInvoiceEditorType(state.type) ? (
                <div className="grid gap-2">
                  <Label htmlFor={typeFieldId}>{t('domain:editor.documentType')}</Label>
                  <Select
                    id={typeFieldId}
                    value={state.type}
                    onChange={(_, { value }) =>
                      setState((current) => {
                        if (!current) return current;
                        const template = templateById(current.invoiceTemplateId);
                        return withTemplate(
                          { ...current, type: value as EditableDocumentType },
                          template,
                          template,
                          current.type,
                        );
                      })
                    }
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
              {activeTemplates.length > 0 || state.invoiceTemplateId ? (
                <div className="grid gap-2">
                  <Label htmlFor={templateFieldId}>{t('domain:editor.template.label')}</Label>
                  <Select
                    id={templateFieldId}
                    value={state.invoiceTemplateId ?? ''}
                    onChange={(_, { value }) => selectTemplate(value || null)}
                  >
                    <option value="">
                      {defaultTemplate
                        ? t('domain:editor.template.companyDefault', { name: defaultTemplate.name })
                        : t('domain:editor.template.bautakt')}
                    </option>
                    {[
                      ...activeTemplates,
                      ...(templateById(state.invoiceTemplateId)?.archived_at
                        ? [templateById(state.invoiceTemplateId)!]
                        : []),
                    ].map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <div className="grid gap-2 @lg:col-span-2">
                <Label htmlFor={subjectFieldId}>{t('domain:editor.subject.label')}</Label>
                <Input
                  id={subjectFieldId}
                  value={state.subject}
                  maxLength={300}
                  placeholder={t('domain:editor.subject.placeholder')}
                  onChange={(event) => update({ subject: event.target.value })}
                />
              </div>
            </div>
          </Section>

          <Section title={t('domain:editor.sections.recipient')}>
            <div className="grid gap-4 @lg:grid-cols-2">
              <div className="grid content-start gap-2">
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
                  info={t('domain:invoices.buyerReferenceHint', {
                    max: BUYER_REFERENCE_MAX_LENGTH,
                  })}
                  value={state.buyerReference}
                  onChange={(value) => update({ buyerReference: value })}
                  maxLength={BUYER_REFERENCE_MAX_LENGTH}
                  invalid={buyerReferenceTooLong || leitwegMissing}
                  hint={leitwegMissing ? t('domain:eInvoice.leitwegRequired') : undefined}
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
              {state.lines.map((line) =>
                line.kind === 'partial_credit' ? (
                  <div
                    key={line.key}
                    className="border-border bg-muted/40 flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Text weight="semibold">{line.title}</Text>
                      <Text size={200} className="text-muted-foreground">
                        {line.description}
                      </Text>
                    </div>
                    <span className="text-foreground text-sm font-medium tabular-nums">
                      {formatMoney(lineNetMinor(line))}
                    </span>
                    <DangerIconButton
                      aria-label={t('domain:editor.removeLine')}
                      onClick={() => removeLine(line.key)}
                      icon={<DeleteRegular />}
                    />
                  </div>
                ) : (
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
                        onClick={() => removeLine(line.key)}
                        icon={<DeleteRegular />}
                      />
                    </div>
                  </div>
                ),
              )}

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => update({ lines: [...state.lines, emptyLine()] })}
                    icon={<AddRegular />}
                  >
                    {t('domain:editor.addLine')}
                  </Button>
                  {state.type === 'final_invoice' ? (
                    <Tooltip
                      content={t('domain:editor.partialCredits.needsOrder')}
                      relationship="description"
                      visible={state.orderId ? false : undefined}
                    >
                      <Button
                        icon={<ReceiptMoneyRegular />}
                        disabledFocusable={!state.orderId || importingOrder}
                        onClick={() => state.orderId && void applyPartialCredits(state.orderId)}
                      >
                        {t('domain:editor.partialCredits.action')}
                      </Button>
                    </Tooltip>
                  ) : null}
                </div>

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

      <ReleaseDialog
        open={confirmRelease}
        kind={labelType}
        pending={busy === 'release'}
        preview={releasePreview}
        datevDocumentId={dirty ? null : documentId}
        onConfirm={(sendAfter) => void onConfirmRelease(sendAfter)}
        onClose={() => setConfirmRelease(false)}
      />

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
  info,
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  invalid?: boolean;
  maxLength?: number;
  /** Erklärung hinter einem „?“ neben der Beschriftung, öffnet per Klick. */
  info?: string;
  /** Fehlermeldung unter dem Feld, sichtbar ohne Klick. */
  hint?: string;
}) {
  const fieldId = useId();
  const hintId = useId();
  return (
    <div className="grid content-start gap-2">
      {info ? (
        <div className="flex items-center gap-1">
          <Label htmlFor={fieldId}>{label}</Label>
          <HelpButton label={label}>
            <p>{info}</p>
          </HelpButton>
        </div>
      ) : (
        <Label htmlFor={fieldId}>{label}</Label>
      )}
      <Input
        id={fieldId}
        input={numeric ? { className: 'text-right tabular-nums' } : undefined}
        inputMode={numeric ? 'decimal' : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={hint ? hintId : undefined}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? (
        <p id={hintId} className="text-destructive text-sm">
          {hint}
        </p>
      ) : null}
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
    <div className="grid min-w-0 content-start gap-2">
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
