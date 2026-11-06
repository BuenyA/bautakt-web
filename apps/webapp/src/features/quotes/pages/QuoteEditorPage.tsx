import {
  formatMoney,
  TAX_MODES,
  type TaxMode,
  taxModeChargesVat,
  taxModeNotice,
  toTaxMode,
} from '@bautakt/finance';
import { toast } from '@bautakt/ui';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
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
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { CheckmarkCircleRegular, SaveRegular } from '@fluentui/react-icons';
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';

import { DiscardChangesDialog } from '@/components/common/DiscardChangesDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { DatePicker } from '@/components/form/dateTime';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { ContactPicker } from '@/features/contacts/ContactPicker';
import { useContacts } from '@/features/contacts/useContacts';
import { useCompanyTaxProfile } from '@/features/finance/useDocumentEditor';
import { useOrders } from '@/features/orders/useOrders';
import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';

import { addDaysIso, berlinToday } from '../quoteList';
import { ensureQuoteOriginal } from '../quoteOutput';
import { nodesFromRows, parseDecimal, quoteTotals, suggestBillingMode } from '../quoteTree';
import { QuoteTreeEditor } from '../QuoteTreeEditor';
import {
  BILLING_MODES,
  type BillingMode,
  CONTRACT_BASES,
  type ContractBasis,
  type QuoteDraftData,
  type QuoteEditorState,
  type QuoteKind,
  useCreateQuoteVersion,
  useIssueQuoteVersion,
  useQuoteDraft,
  useSaveQuoteDraft,
} from '../useQuoteEditor';

/** Vorgabe für „Gültig bis“, bis es die Einstellung „Kalkulation“ gibt (Plan, Abschnitt 4). */
const DEFAULT_VALIDITY_DAYS = 30;

function emptyState(taxMode: TaxMode): QuoteEditorState {
  const today = berlinToday();
  return {
    kind: 'main',
    customerId: null,
    contactPersonId: null,
    orderId: null,
    subject: '',
    siteStreet: '',
    sitePostalCode: '',
    siteCity: '',
    siteCountry: '',
    responsibleUserId: null,
    followUpOn: null,
    quoteDate: today,
    validUntil: addDaysIso(today, DEFAULT_VALIDITY_DAYS),
    execFrom: '',
    execTo: '',
    contractBasis: 'bgb',
    billingMode: 'unit_price',
    taxMode,
    discountPercent: '0',
    introText: '',
    prelimText: '',
    closingText: '',
    invoiceTemplateId: null,
    calcMode: 'simple',
    currency: 'EUR',
    nodes: [],
  };
}

function stateFromDraft(data: QuoteDraftData, isSmallBusiness: boolean): QuoteEditorState | null {
  const { quote, draft } = data;
  if (!quote || !draft) return null;
  const taxMode: TaxMode = isSmallBusiness ? 'small_business' : toTaxMode(draft.tax_mode);
  const quoteDate = draft.quote_date ?? berlinToday();
  // Ohne Umsatzsteuer stehen die Sätze gespeichert auf 0. Wer zurück auf
  // `standard` wechselt, soll dann nicht jede Position mit 0 % finden.
  const nodes = nodesFromRows(data.items).map((node) =>
    node.nodeType === 'position' &&
    taxMode !== 'standard' &&
    parseDecimal(node.taxRatePercent) === 0
      ? { ...node, taxRatePercent: '19' }
      : node,
  );
  return {
    kind: quote.kind === 'addendum' ? 'addendum' : 'main',
    customerId: quote.customer_id,
    contactPersonId: quote.contact_person_id,
    orderId: quote.order_id,
    subject: quote.subject,
    siteStreet: quote.site_street,
    sitePostalCode: quote.site_postal_code,
    siteCity: quote.site_city,
    siteCountry: quote.site_country,
    responsibleUserId: quote.responsible_user_id,
    followUpOn: quote.follow_up_on,
    quoteDate,
    // Eine neue Version startet ohne Datum (create_quote_version): vorbelegt
    // wie ein neues Angebot, sichtbar und änderbar.
    validUntil: draft.valid_until ?? addDaysIso(quoteDate, DEFAULT_VALIDITY_DAYS),
    execFrom: draft.exec_from ?? '',
    execTo: draft.exec_to ?? '',
    contractBasis: draft.contract_basis === 'vob_b' ? 'vob_b' : 'bgb',
    billingMode: (BILLING_MODES as readonly string[]).includes(draft.billing_mode)
      ? (draft.billing_mode as BillingMode)
      : 'unit_price',
    taxMode,
    discountPercent: String(Number(draft.discount_percent)).replace('.', ','),
    introText: draft.intro_text,
    prelimText: draft.prelim_text,
    closingText: draft.closing_text,
    invoiceTemplateId: draft.invoice_template_id,
    calcMode: draft.calc_mode,
    currency: draft.currency,
    nodes,
  };
}

export function QuoteEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // Vom Auftrag aus: Auftrag und Art vorbelegt, Kunde folgt dem Auftrag.
  const presetOrderId = id ? null : searchParams.get('auftrag');
  const presetKind: QuoteKind = searchParams.get('art') === 'nachtrag' ? 'addendum' : 'main';
  const navigate = useNavigate();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const canIssue = usePermission('canIssueQuotes');
  const canEdit = usePermission('canEditQuotes');

  const draft = useQuoteDraft(id);
  const taxProfile = useCompanyTaxProfile();
  const contacts = useContacts();
  const orders = useOrders();
  const save = useSaveQuoteDraft();
  const issue = useIssueQuoteVersion();
  const createVersion = useCreateQuoteVersion();

  const isSmallBusiness = taxProfile.data?.isSmallBusiness ?? false;

  const [state, setState] = useState<QuoteEditorState | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(id ?? null);
  const [busy, setBusy] = useState<'save' | 'issue' | null>(null);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Erst füllen, wenn Betrieb und ggf. Entwurf geladen sind; sonst stünde kurz
  // `standard` statt § 19 im Formular. Danach gehört der Zustand dem Formular.
  if (state === null && taxProfile.data && (!presetOrderId || orders.data)) {
    const presetOrder = (orders.data ?? []).find((row) => row.id === presetOrderId);
    const start = id
      ? draft.data
        ? stateFromDraft(draft.data, isSmallBusiness)
        : null
      : {
          ...emptyState(isSmallBusiness ? 'small_business' : 'standard'),
          ...(presetOrder
            ? { kind: presetKind, orderId: presetOrder.id, customerId: presetOrder.customer_id }
            : {}),
        };
    if (start) {
      setState(start);
      setBaseline(JSON.stringify(start));
    }
  }

  const update = useCallback(
    (patch: Partial<QuoteEditorState>) =>
      setState((current) => (current ? { ...current, ...patch } : current)),
    [],
  );
  const changeNodes = useCallback(
    (fn: (nodes: QuoteEditorState['nodes']) => QuoteEditorState['nodes']) =>
      setState((current) => {
        if (!current) return current;
        const nodes = fn(current.nodes);
        // Abrechnungsart folgt den Positionen, solange niemand `regie` gewählt hat.
        return { ...current, nodes, billingMode: suggestBillingMode(nodes, current.billingMode) };
      }),
    [],
  );

  const discount = state ? parseDecimal(state.discountPercent) : 0;
  const totals = useMemo(
    () => (state ? quoteTotals(state.nodes, state.taxMode, discount) : null),
    [state, discount],
  );

  const dirty = state !== null && baseline !== null && JSON.stringify(state) !== baseline;
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

  const ids = {
    kind: useId(),
    order: useId(),
    subject: useId(),
    contract: useId(),
    billing: useId(),
    taxMode: useId(),
    discount: useId(),
    intro: useId(),
    prelim: useId(),
    closing: useId(),
    customer: useId(),
  };

  if (id && (draft.isLoading || (!state && draft.data?.draft))) return <PageSpinner />;
  if (!id && !state) return <PageSpinner />;

  if (id && (draft.isError || !draft.data?.quote)) {
    return (
      <EmptyState
        title={
          draft.isError
            ? t('domain:quotes.workspace.loadErrorTitle')
            : t('domain:quotes.workspace.notFoundTitle')
        }
        description={
          draft.isError
            ? t('domain:quotes.workspace.loadErrorDescription')
            : t('domain:quotes.workspace.notFoundDescription')
        }
        action={<LinkButton to={routes.quotes}>{t('domain:quotes.workspace.back')}</LinkButton>}
      />
    );
  }

  // Alles festgeschrieben: Ändern geht nur über eine neue Version.
  if (id && !draft.data?.draft) {
    const decided = Boolean(draft.data?.quote?.decision);
    return (
      <EmptyState
        title={t('domain:quotes.editor.lockedTitle')}
        description={
          decided
            ? t('domain:quotes.editor.lockedDecided')
            : t('domain:quotes.editor.lockedDescription')
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton to={routes.quote(id)}>{t('domain:quotes.editor.toQuote')}</LinkButton>
            {!decided && canEdit ? (
              <Button
                appearance="primary"
                disabled={createVersion.isPending}
                onClick={() =>
                  createVersion.mutate(id, {
                    onSuccess: () => {
                      setState(null);
                      void draft.refetch();
                    },
                    onError: (cause) =>
                      toast.error(t('domain:quotes.editor.newVersionError'), {
                        description: readableDbError(cause) ?? undefined,
                      }),
                  })
                }
              >
                {t('domain:quotes.editor.newVersion')}
              </Button>
            ) : null}
          </div>
        }
      />
    );
  }

  if (!state || !totals || !companyId) return <PageSpinner />;

  const customer = (contacts.data ?? []).find((row) => row.id === state.customerId);
  const notice = taxModeNotice(state.taxMode, taxProfile.data?.country);
  const missingBuyerVatId =
    state.taxMode === 'reverse_charge' && Boolean(customer) && !customer?.vat_id?.trim();
  const validBeforeDate = Boolean(
    state.validUntil && state.quoteDate && state.validUntil < state.quoteDate,
  );
  const execBeforeStart = Boolean(state.execFrom && state.execTo && state.execTo < state.execFrom);
  const addendumWithoutOrder = state.kind === 'addendum' && !state.orderId;
  const documentNumber = draft.data?.quote?.document_number;
  const versionNo = draft.data?.draft?.version_no;

  /** Was das Speichern verhindern würde: Prüfungen der Datenbank, vorab gemeldet. */
  function saveBlocker(): string | null {
    if (addendumWithoutOrder) return t('domain:quotes.editor.addendumNeedsOrder');
    if (validBeforeDate) return t('domain:quotes.editor.validBeforeDate');
    if (execBeforeStart) return t('domain:quotes.editor.execBeforeStart');
    return null;
  }

  /** Pflichtangaben zum Festschreiben, dieselben wie in `issue_quote_version`. */
  function issueBlocker(): string | null {
    const current = state!;
    if (!current.customerId) return t('domain:quotes.editor.missing.customer');
    if (!current.subject.trim()) return t('domain:quotes.editor.missing.subject');
    if (!current.validUntil) return t('domain:quotes.editor.missing.validUntil');
    if (!current.nodes.some((n) => n.nodeType === 'position'))
      return t('domain:quotes.editor.missing.positions');
    if (current.nodes.some((n) => n.nodeType !== 'text' && !n.shortText.trim()))
      return t('domain:quotes.editor.missing.shortText');
    return saveBlocker();
  }

  async function persist() {
    const current = state!;
    const saved = await save.mutateAsync({ state: current, quoteId });
    setQuoteId(saved.quoteId);
    setBaseline(JSON.stringify(current));
    // Gespeichert ist gespeichert: Die folgende Navigation fragt nicht nach.
    dirtyRef.current = false;
    return saved;
  }

  function leaveTo(path: string) {
    leavingRef.current = true;
    void navigate(path);
  }

  async function onSave() {
    const blocker = saveBlocker();
    setError(blocker);
    if (blocker) return;
    setBusy('save');
    try {
      const saved = await persist();
      toast.success(t('domain:quotes.editor.saved'));
      // Nach dem ersten Speichern hat der Entwurf eine Adresse.
      if (!id) {
        void navigate(routes.quoteEdit(saved.quoteId), { replace: true });
      }
    } catch (cause) {
      // Eine Transaktion: Der vorige Stand in der Datenbank bleibt unverändert,
      // die Eingaben hier ebenso.
      toast.error(t('domain:quotes.editor.saveError'), {
        description: readableDbError(cause) ?? undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  function onIssue() {
    const blocker = issueBlocker();
    setError(blocker);
    if (blocker) return;
    setConfirmIssue(true);
  }

  async function onConfirmIssue() {
    setBusy('issue');
    let saved: { quoteId: string; versionId: string } | null = null;
    try {
      saved = await persist();
      await issue.mutateAsync({
        versionId: saved.versionId,
        netMinor: totals!.netMinor,
        grossMinor: totals!.grossMinor,
      });
      toast.success(t('domain:quotes.editor.issued'));
      // Das Original entsteht gleich nach dem Festschreiben. Scheitert das, holt
      // die Detailseite es beim ersten Öffnen oder Versenden nach.
      void ensureQuoteOriginal(saved.versionId).catch(() =>
        toast.warning(t('domain:quotes.output.originalPending')),
      );
      leaveTo(routes.quote(saved.quoteId));
    } catch (cause) {
      setConfirmIssue(false);
      toast.error(
        saved ? t('domain:quotes.editor.issueError') : t('domain:quotes.editor.saveError'),
        { description: readableDbError(cause) ?? undefined },
      );
    } finally {
      setBusy(null);
    }
  }

  const backTo = quoteId ? routes.quote(quoteId) : routes.quotes;

  function onCancel() {
    if (dirty) setConfirmDiscard(true);
    else leaveTo(backTo);
  }

  const discardOpen = confirmDiscard || blocker.state === 'blocked';
  const chargesVat = taxModeChargesVat(state.taxMode);
  const title = documentNumber
    ? t('domain:quotes.editor.editTitle', { number: documentNumber, version: versionNo ?? 1 })
    : quoteId
      ? t('domain:quotes.editor.draftTitle')
      : t('domain:quotes.editor.newTitle');

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        description={t('domain:quotes.editor.description')}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Text size={200} className="text-muted-foreground" aria-live="polite">
              {busy !== null
                ? t('domain:quotes.editor.saving')
                : dirty || !quoteId
                  ? t('domain:quotes.editor.notSaved')
                  : t('domain:quotes.editor.savedState')}
            </Text>
            <Button disabled={busy !== null} onClick={onCancel}>
              {t('common:action.cancel')}
            </Button>
            <Button icon={<SaveRegular />} disabled={busy !== null} onClick={() => void onSave()}>
              {t('domain:quotes.editor.saveDraft')}
            </Button>
            {canIssue ? (
              <Button
                appearance="primary"
                icon={<CheckmarkCircleRegular />}
                disabled={busy !== null}
                onClick={onIssue}
              >
                {t('domain:quotes.editor.issue')}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <MessageBar intent="error" role="alert">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div className="@container flex min-w-0 flex-col gap-4">
        <Section title={t('domain:quotes.editor.sections.quote')}>
          <div className="grid gap-4 @lg:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label htmlFor={ids.customer} required>
                {t('domain:quotes.columns.customer')}
              </Label>
              <ContactPicker
                id={ids.customer}
                contactRole="customer"
                value={state.customerId}
                onChange={(contact) =>
                  update({
                    customerId: contact?.id ?? null,
                    // Ansprechpartner gehört zum Kunden; beim Wechsel fällt er weg.
                    contactPersonId:
                      contact?.id === state.customerId ? state.contactPersonId : null,
                  })
                }
                allowNone
                noneLabel={t('domain:quotes.editor.noCustomer')}
              />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor={ids.kind}>{t('domain:quotes.workspace.kindLabel')}</Label>
              <Select
                id={ids.kind}
                value={state.kind}
                // Die Art steht nach dem ersten Festschreiben fest wie die Nummer.
                disabled={Boolean(documentNumber)}
                onChange={(_, { value }) => update({ kind: value as QuoteKind })}
              >
                <option value="main">{t('domain:quotes.workspace.kind.main')}</option>
                <option value="addendum">{t('domain:quotes.workspace.kind.addendum')}</option>
              </Select>
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor={ids.order} required={state.kind === 'addendum'}>
                {t('domain:quotes.workspace.order')}
              </Label>
              <Select
                id={ids.order}
                value={state.orderId ?? ''}
                aria-invalid={addendumWithoutOrder || undefined}
                onChange={(_, { value }) => {
                  const order = (orders.data ?? []).find((row) => row.id === value);
                  update({
                    orderId: value || null,
                    // Auftrag gewählt, Kunde noch leer: Kunde des Auftrags.
                    customerId: state.customerId ?? order?.customer_id ?? null,
                  });
                }}
              >
                <option value="">{t('domain:quotes.editor.noOrder')}</option>
                {(orders.data ?? []).map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.customer_label ? `${order.name} · ${order.customer_label}` : order.name}
                  </option>
                ))}
              </Select>
              {addendumWithoutOrder ? (
                <p className="text-destructive text-sm">
                  {t('domain:quotes.editor.addendumNeedsOrder')}
                </p>
              ) : null}
            </div>
            <div className="grid content-start gap-2 @lg:col-span-2">
              <Label htmlFor={ids.subject} required>
                {t('domain:quotes.workspace.subject')}
              </Label>
              <Input
                id={ids.subject}
                value={state.subject}
                maxLength={300}
                placeholder={t('domain:quotes.editor.subjectPlaceholder')}
                onChange={(event) => update({ subject: event.target.value })}
              />
            </div>
          </div>
        </Section>

        <Section title={t('domain:quotes.editor.sections.terms')}>
          <div className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-4">
            <DateField
              label={t('domain:quotes.editor.quoteDate')}
              value={state.quoteDate}
              onChange={(value) => update({ quoteDate: value })}
            />
            <DateField
              label={t('domain:quotes.workspace.validUntil')}
              value={state.validUntil}
              required
              invalid={validBeforeDate}
              hint={validBeforeDate ? t('domain:quotes.editor.validBeforeDate') : undefined}
              onChange={(value) => update({ validUntil: value })}
            />
            <DateField
              label={t('domain:quotes.editor.execFrom')}
              value={state.execFrom}
              onChange={(value) => update({ execFrom: value })}
            />
            <DateField
              label={t('domain:quotes.editor.execTo')}
              value={state.execTo}
              invalid={execBeforeStart}
              hint={execBeforeStart ? t('domain:quotes.editor.execBeforeStart') : undefined}
              onChange={(value) => update({ execTo: value })}
            />
            <div className="grid content-start gap-2">
              <Label htmlFor={ids.contract}>{t('domain:quotes.editor.contractBasis')}</Label>
              <Select
                id={ids.contract}
                value={state.contractBasis}
                onChange={(_, { value }) => update({ contractBasis: value as ContractBasis })}
              >
                {CONTRACT_BASES.map((basis) => (
                  <option key={basis} value={basis}>
                    {t(`domain:quotes.editor.contractBases.${basis}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor={ids.billing}>{t('domain:quotes.editor.billingMode')}</Label>
              <Select
                id={ids.billing}
                value={state.billingMode}
                onChange={(_, { value }) => update({ billingMode: value as BillingMode })}
              >
                {BILLING_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`domain:quotes.editor.billingModes.${mode}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Section>

        <Accordion
          collapsible
          multiple
          defaultOpenItems={[
            ...(state.siteStreet || state.siteCity || state.sitePostalCode ? ['site'] : []),
            ...(state.introText || state.prelimText || state.closingText ? ['texts'] : []),
          ]}
        >
          <AccordionItem value="site">
            <AccordionHeader>{t('domain:quotes.editor.sections.site')}</AccordionHeader>
            <AccordionPanel>
              <div className="grid gap-4 pb-2 @lg:grid-cols-4">
                <div className="@lg:col-span-2">
                  <TextField
                    label={t('domain:quotes.editor.siteStreet')}
                    value={state.siteStreet}
                    onChange={(value) => update({ siteStreet: value })}
                  />
                </div>
                <TextField
                  label={t('domain:quotes.editor.sitePostalCode')}
                  value={state.sitePostalCode}
                  onChange={(value) => update({ sitePostalCode: value })}
                />
                <TextField
                  label={t('domain:quotes.editor.siteCity')}
                  value={state.siteCity}
                  onChange={(value) => update({ siteCity: value })}
                />
              </div>
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="texts">
            <AccordionHeader>{t('domain:quotes.editor.sections.texts')}</AccordionHeader>
            <AccordionPanel>
              <div className="grid gap-4 pb-2">
                <AreaField
                  id={ids.intro}
                  label={t('domain:quotes.editor.introText')}
                  value={state.introText}
                  onChange={(value) => update({ introText: value })}
                />
                <AreaField
                  id={ids.prelim}
                  label={t('domain:quotes.editor.prelimText')}
                  value={state.prelimText}
                  onChange={(value) => update({ prelimText: value })}
                />
                <AreaField
                  id={ids.closing}
                  label={t('domain:quotes.editor.closingText')}
                  value={state.closingText}
                  onChange={(value) => update({ closingText: value })}
                />
              </div>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Section title={t('domain:quotes.editor.sections.items')}>
          <QuoteTreeEditor
            nodes={state.nodes}
            onChange={changeNodes}
            defaultTaxRate="19"
            chargesVat={chargesVat}
            disabled={busy !== null}
          />
        </Section>

        <div className="grid gap-4 @3xl:grid-cols-2">
          <Section title={t('domain:quotes.editor.sections.taxMode')}>
            <div className="flex flex-col gap-3">
              <div className="grid gap-2 @lg:max-w-sm">
                <Label htmlFor={ids.taxMode} className="sr-only">
                  {t('domain:quotes.editor.sections.taxMode')}
                </Label>
                <Select
                  id={ids.taxMode}
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

          <Section title={t('domain:quotes.editor.sections.totals')}>
            <div className="flex flex-col gap-3">
              <div className="grid max-w-[10rem] gap-2">
                <Label htmlFor={ids.discount}>{t('domain:quotes.editor.discount')}</Label>
                <Input
                  id={ids.discount}
                  inputMode="decimal"
                  input={{ className: 'text-right tabular-nums' }}
                  contentAfter="%"
                  value={state.discountPercent}
                  aria-invalid={discount < 0 || discount > 100 || undefined}
                  onChange={(event) => update({ discountPercent: event.target.value })}
                />
              </div>
              <dl className="flex w-full flex-col gap-1 text-sm">
                {totals.discountMinor !== 0 ? (
                  <>
                    <SumRow
                      label={t('domain:quotes.editor.subtotal')}
                      value={formatMoney(totals.subtotalMinor)}
                    />
                    <SumRow
                      label={t('domain:quotes.editor.discountAmount', {
                        percent: state.discountPercent,
                      })}
                      value={formatMoney(-totals.discountMinor)}
                    />
                  </>
                ) : null}
                <SumRow label={t('domain:invoices.net')} value={formatMoney(totals.netMinor)} />
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
              {totals.alternativeMinor !== 0 || totals.contingencyMinor !== 0 ? (
                <div className="border-border flex flex-col gap-1 border-t pt-3 text-sm">
                  <p className="text-muted-foreground">{t('domain:quotes.editor.notInTotal')}</p>
                  <dl className="flex flex-col gap-1">
                    {totals.alternativeMinor !== 0 ? (
                      <SumRow
                        label={t('domain:quotes.editor.alternativeSum')}
                        value={formatMoney(totals.alternativeMinor)}
                      />
                    ) : null}
                    {totals.contingencyMinor !== 0 ? (
                      <SumRow
                        label={t('domain:quotes.editor.contingencySum')}
                        value={formatMoney(totals.contingencyMinor)}
                      />
                    ) : null}
                  </dl>
                </div>
              ) : null}
            </div>
          </Section>
        </div>
      </div>

      <Dialog open={confirmIssue} onOpenChange={(_, data) => !busy && setConfirmIssue(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('domain:quotes.editor.issueDialog.title')}</DialogTitle>
            <DialogContent className="flex flex-col gap-3">
              <p>
                {documentNumber
                  ? t('domain:quotes.editor.issueDialog.nextVersion', { number: documentNumber })
                  : t('domain:quotes.editor.issueDialog.firstVersion')}
              </p>
              <p>{t('domain:quotes.editor.issueDialog.locked')}</p>
              <dl className="flex flex-col gap-1 text-sm">
                <SumRow label={t('domain:invoices.net')} value={formatMoney(totals.netMinor)} />
                <SumRow
                  label={t('domain:invoices.gross')}
                  value={formatMoney(totals.grossMinor)}
                  strong
                />
              </dl>
            </DialogContent>
            <DialogActions>
              <Button disabled={busy !== null} onClick={() => setConfirmIssue(false)}>
                {t('common:action.cancel')}
              </Button>
              <Button
                appearance="primary"
                disabled={busy !== null}
                icon={busy === 'issue' ? <Spinner size="tiny" /> : <CheckmarkCircleRegular />}
                onClick={() => void onConfirmIssue()}
              >
                {t('domain:quotes.editor.issueDialog.confirm')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <DiscardChangesDialog
        open={discardOpen}
        onDismiss={() => {
          setConfirmDiscard(false);
          if (blocker.state === 'blocked') blocker.reset();
        }}
        title={t('domain:editor.discard.title')}
        description={t('domain:editor.discard.description')}
        keepLabel={t('domain:editor.discard.keep')}
        discardLabel={t('domain:editor.discard.confirm')}
        onKeep={() => {
          setConfirmDiscard(false);
          if (blocker.state === 'blocked') blocker.reset();
        }}
        onDiscard={() => {
          setConfirmDiscard(false);
          if (blocker.state === 'blocked') blocker.proceed();
          else leaveTo(backTo);
        }}
      />
    </div>
  );
}

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

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function AreaField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        resize="vertical"
        value={value}
        onChange={(_, data) => onChange(data.value)}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  hint,
  invalid,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  invalid?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="grid min-w-0 content-start gap-2">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <DatePicker
        id={id}
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={onChange}
      />
      {hint ? (
        <p id={hintId} className="text-destructive text-sm">
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
