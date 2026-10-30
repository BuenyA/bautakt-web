import {
  eurosToMinor,
  formatIsoDateDe,
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
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { AddRegular, ArrowUndoRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker } from '@/components/form/dateTime';
import { usePermission } from '@/features/company/usePermission';
import { readableDbError } from '@/lib/dbErrors';
import { formatDateTime } from '@/lib/format';

import type { IncomingInvoiceStatus } from './incomingInvoiceForm';
import type { IncomingReviewStatus } from './incomingReview';
import {
  activeSkonto,
  canNoteSkonto,
  discountUntilFromTerms,
  isDiscountExpired,
  MAX_AGREED_WITH,
  MAX_SKONTO_REASON,
  parsePercentInput,
  payable,
  type SkontoEntry,
  skontoErrors,
  skontoFromPercent,
} from './incomingSkonto';
import {
  useNoteSkonto,
  useReverseSkonto,
  useSkontoEntries,
  useSupplierSkontoTerms,
} from './useIncomingSkonto';

export type SkontoInvoice = {
  id: string;
  gross_total: number;
  invoice_date: string;
  supplier_id: string | null;
};

/**
 * Skonto-Vermerk und Zahlbetrag einer erfassten Eingangsrechnung (#166).
 * Das Original bleibt unverändert; der Vermerk steht daneben, korrigiert wird
 * per Gegen-Eintrag. Vermerken darf, wer Gemeinkosten verwaltet; das Recht
 * prüft die Datenbank noch einmal.
 */
export function IncomingSkontoSection({
  invoice,
  status,
  reviewStatus,
}: {
  invoice: SkontoInvoice;
  status: IncomingInvoiceStatus;
  reviewStatus: IncomingReviewStatus;
}) {
  const { t } = useTranslation();
  const canManage = usePermission('canManageOverheadCosts');
  const entries = useSkontoEntries(invoice.id);
  const [noting, setNoting] = useState(false);
  const [reversing, setReversing] = useState<SkontoEntry | null>(null);
  const grossMinor = eurosToMinor(invoice.gross_total);

  if (entries.isPending) return <Spinner size="tiny" />;
  if (entries.isError) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          {readableDbError(entries.error) ?? t('domain:incomingSkonto.loadError')}
        </MessageBarBody>
        <MessageBarActions>
          <Button onClick={() => void entries.refetch()}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      </MessageBar>
    );
  }

  const active = activeSkonto(entries.data);
  const totals = payable(grossMinor, entries.data);
  const expired = totals.discountUntil
    ? isDiscountExpired(totals.discountUntil, todayIso())
    : false;

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        <dt className="text-muted-foreground text-sm">{t('domain:incomingSkonto.gross')}</dt>
        <dd className="text-sm tabular-nums">{formatMoney(grossMinor)}</dd>
        {active ? (
          <>
            <dt className="text-muted-foreground text-sm">
              {active.percent !== null
                ? t('domain:incomingSkonto.skontoPercent', {
                    percent: formatPercent(active.percent),
                  })
                : t('domain:incomingSkonto.skonto')}
            </dt>
            <dd className="text-sm tabular-nums">− {formatMoney(totals.skontoMinor)}</dd>
          </>
        ) : null}
        <dt className="text-sm font-semibold">{t('domain:incomingSkonto.payable')}</dt>
        <dd className="text-sm font-semibold tabular-nums">{formatMoney(totals.payableMinor)}</dd>
        {totals.discountUntil ? (
          <>
            <dt className="text-muted-foreground text-sm">
              {t('domain:incomingSkonto.discountUntil')}
            </dt>
            <dd className="flex flex-wrap items-center gap-2 text-sm">
              {formatIsoDateDe(totals.discountUntil)}
              {expired ? (
                <Badge appearance="tint" color="danger" size="small">
                  {t('domain:incomingSkonto.expired')}
                </Badge>
              ) : null}
            </dd>
          </>
        ) : null}
      </dl>

      {active ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:incomingSkonto.agreed', {
            with: active.agreed_with ?? '',
            on: formatIsoDateDe(active.agreed_on ?? ''),
          })}
        </Text>
      ) : null}
      {expired ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:incomingSkonto.expiredHint')}
        </Text>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {canNoteSkonto(status, reviewStatus, grossMinor, entries.data) ? (
            <Button type="button" icon={<AddRegular />} onClick={() => setNoting(true)}>
              {t('domain:incomingSkonto.note')}
            </Button>
          ) : null}
          {active ? (
            <Button type="button" icon={<ArrowUndoRegular />} onClick={() => setReversing(active)}>
              {t('domain:incomingSkonto.reverse')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <Text size={200} className="text-muted-foreground">
        {t('domain:incomingSkonto.originalHint')}
      </Text>

      {entries.data.length > 0 ? <SkontoLog entries={entries.data} /> : null}

      {noting ? (
        <NoteSkontoDialog
          invoice={invoice}
          grossMinor={grossMinor}
          onClose={() => setNoting(false)}
        />
      ) : null}
      {reversing ? (
        <ReverseSkontoDialog
          invoiceId={invoice.id}
          entry={reversing}
          onClose={() => setReversing(null)}
        />
      ) : null}
    </div>
  );
}

function formatPercent(percent: number): string {
  return percent.toLocaleString('de-DE', { maximumFractionDigits: 4 });
}

/** Verlauf: jeder Vermerk und Gegen-Eintrag, unveränderbar. */
function SkontoLog({ entries }: { entries: SkontoEntry[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <Text as="h3" size={300} weight="semibold">
        {t('domain:incomingSkonto.log')}
      </Text>
      <ol className="border-border flex flex-col gap-3 border-l pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-0.5">
            <Text size={200} weight="semibold">
              {entry.reverses_id
                ? t('domain:incomingSkonto.action.reversed', {
                    amount: formatMoney(-entry.amountMinor),
                  })
                : t('domain:incomingSkonto.action.noted', {
                    amount: formatMoney(entry.amountMinor),
                    until: formatIsoDateDe(entry.discount_until ?? ''),
                  })}
            </Text>
            <Text size={200} className="text-muted-foreground">
              {t('domain:incomingReview.by', {
                name: entry.actor_name || t('domain:incomingReview.unknownActor'),
                at: formatDateTime(entry.created_at),
              })}
            </Text>
            {entry.reverses_id ? null : (
              <Text size={200}>
                {t('domain:incomingSkonto.agreed', {
                  with: entry.agreed_with ?? '',
                  on: formatIsoDateDe(entry.agreed_on ?? ''),
                })}
              </Text>
            )}
            <Text size={200} className="whitespace-pre-wrap">
              {entry.reason}
            </Text>
          </li>
        ))}
      </ol>
    </div>
  );
}

function NoteSkontoDialog({
  invoice,
  grossMinor,
  onClose,
}: {
  invoice: SkontoInvoice;
  grossMinor: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const note = useNoteSkonto(invoice.id);
  const terms = useSupplierSkontoTerms(invoice.supplier_id);
  const [percent, setPercent] = useState('');
  const [amount, setAmount] = useState('');
  const [agreedWith, setAgreedWith] = useState('');
  const [agreedOn, setAgreedOn] = useState(todayIso());
  const [discountUntil, setDiscountUntil] = useState('');
  const [reason, setReason] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vorschlag aus dem Lieferanten-Stamm, einmal und nur in leere Felder.
  if (!prefilled && terms.data !== undefined) {
    setPrefilled(true);
    const termPercent = terms.data?.discount_percent ?? null;
    if (termPercent !== null && termPercent > 0 && percent === '' && amount === '') {
      setPercentAndAmount(formatPercent(termPercent));
    }
    const until = discountUntilFromTerms(invoice.invoice_date, terms.data?.discount_days ?? null);
    if (until && discountUntil === '') setDiscountUntil(until);
  }

  function setPercentAndAmount(value: string) {
    setPercent(value);
    const parsed = parsePercentInput(value);
    if (parsed !== null) {
      setAmount(formatMoneyInput(fromMinorUnits(skontoFromPercent(grossMinor, parsed))));
    }
  }

  const parsedPercent = percent.trim() === '' ? null : (parsePercentInput(percent) ?? undefined);
  const amountMinor = parseMoneyInput(amount);
  const errors = skontoErrors(grossMinor, {
    amountMinor,
    percent: parsedPercent,
    reason,
    agreedWith,
    agreedOn,
    discountUntil,
  });
  const message = (key: keyof typeof errors) =>
    showErrors && errors[key]
      ? t(`domain:incomingSkonto.errors.${errors[key]}`, {
          max: key === 'reason' ? MAX_SKONTO_REASON : MAX_AGREED_WITH,
          gross: formatMoney(grossMinor),
          expected:
            parsedPercent != null ? formatMoney(skontoFromPercent(grossMinor, parsedPercent)) : '',
        })
      : undefined;

  async function submit() {
    setShowErrors(true);
    setError(null);
    if (Object.keys(errors).length > 0 || amountMinor === null || parsedPercent === undefined) {
      return;
    }
    try {
      await note.mutateAsync({
        amountMinor,
        percent: parsedPercent,
        reason,
        agreedWith,
        agreedOn,
        discountUntil,
      });
      toast.success(t('domain:incomingSkonto.noted'));
      onClose();
    } catch (caught) {
      console.error('Skonto-Vermerk nicht gespeichert', caught);
      setError(readableDbError(caught) ?? t('domain:incomingSkonto.saveError'));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open && !note.isPending) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:incomingSkonto.dialog.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-4">
            <Text>{t('domain:incomingSkonto.dialog.text')}</Text>
            {terms.isError ? (
              <MessageBar intent="warning">
                <MessageBarBody>{t('domain:incomingSkonto.dialog.termsError')}</MessageBarBody>
                <MessageBarActions>
                  <Button onClick={() => void terms.refetch()}>{t('common:action.retry')}</Button>
                </MessageBarActions>
              </MessageBar>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('domain:incomingSkonto.dialog.percent')}
                hint={t('domain:incomingSkonto.dialog.percentHint')}
                validationMessage={message('percent')}
              >
                <Input
                  inputMode="decimal"
                  value={percent}
                  contentAfter="%"
                  onChange={(_, data) => setPercentAndAmount(data.value)}
                />
              </Field>
              <Field
                label={t('domain:incomingSkonto.dialog.amount')}
                required
                validationMessage={message('amount')}
              >
                <Input
                  inputMode="decimal"
                  value={amount}
                  contentAfter="€"
                  onChange={(_, data) => {
                    // Wer den Betrag selbst eintippt, meint keinen Prozentsatz mehr.
                    setAmount(data.value);
                    setPercent('');
                  }}
                />
              </Field>
              <Field
                label={t('domain:incomingSkonto.dialog.agreedWith')}
                required
                validationMessage={message('agreedWith')}
              >
                <Input
                  value={agreedWith}
                  maxLength={MAX_AGREED_WITH}
                  onChange={(_, data) => setAgreedWith(data.value)}
                />
              </Field>
              <Field
                label={t('domain:incomingSkonto.dialog.agreedOn')}
                required
                validationMessage={message('agreedOn')}
              >
                <DatePicker
                  value={agreedOn}
                  onChange={setAgreedOn}
                  aria-label={t('domain:incomingSkonto.dialog.agreedOn')}
                />
              </Field>
              <Field
                label={t('domain:incomingSkonto.discountUntil')}
                required
                validationMessage={message('discountUntil')}
              >
                <DatePicker
                  value={discountUntil}
                  onChange={setDiscountUntil}
                  aria-label={t('domain:incomingSkonto.discountUntil')}
                />
              </Field>
              <div className="flex flex-col justify-end gap-0.5">
                <Text size={200} className="text-muted-foreground">
                  {t('domain:incomingSkonto.payable')}
                </Text>
                <Text weight="semibold" className="tabular-nums">
                  {amountMinor !== null && amountMinor > 0 && amountMinor <= grossMinor
                    ? formatMoney(grossMinor - amountMinor)
                    : '–'}
                </Text>
              </div>
            </div>
            <Field
              label={t('domain:incomingSkonto.dialog.reason')}
              required
              validationMessage={message('reason')}
            >
              <Textarea
                rows={3}
                value={reason}
                maxLength={MAX_SKONTO_REASON}
                onChange={(_, data) => setReason(data.value)}
              />
            </Field>
            {error ? (
              <MessageBar intent="error" layout="multiline">
                <MessageBarBody>{error}</MessageBarBody>
                <MessageBarActions>
                  <Button onClick={() => void submit()}>{t('common:action.retry')}</Button>
                </MessageBarActions>
              </MessageBar>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={note.isPending}>
              {t('common:action.cancel')}
            </Button>
            <Button appearance="primary" onClick={() => void submit()} disabled={note.isPending}>
              {t('domain:incomingSkonto.dialog.submit')}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function ReverseSkontoDialog({
  invoiceId,
  entry,
  onClose,
}: {
  invoiceId: string;
  entry: SkontoEntry;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const reverse = useReverseSkonto(invoiceId);
  const [reason, setReason] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = reason.trim();
  const problem =
    trimmed === '' ? 'reasonRequired' : trimmed.length > MAX_SKONTO_REASON ? 'reasonTooLong' : null;

  async function submit() {
    setShowErrors(true);
    setError(null);
    if (problem) return;
    try {
      await reverse.mutateAsync({ adjustmentId: entry.id, reason });
      toast.success(t('domain:incomingSkonto.reversed'));
      onClose();
    } catch (caught) {
      console.error('Skonto-Gegen-Eintrag nicht gespeichert', caught);
      setError(readableDbError(caught) ?? t('domain:incomingSkonto.saveError'));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open && !reverse.isPending) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:incomingSkonto.reverseDialog.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-4">
            <Text>
              {t('domain:incomingSkonto.reverseDialog.text', {
                amount: formatMoney(entry.amountMinor),
              })}
            </Text>
            <Field
              label={t('domain:incomingSkonto.reverseDialog.reason')}
              required
              validationMessage={
                showErrors && problem
                  ? t(`domain:incomingSkonto.errors.${problem}`, { max: MAX_SKONTO_REASON })
                  : undefined
              }
            >
              <Textarea
                rows={3}
                value={reason}
                maxLength={MAX_SKONTO_REASON}
                onChange={(_, data) => setReason(data.value)}
              />
            </Field>
            {error ? (
              <MessageBar intent="error" layout="multiline">
                <MessageBarBody>{error}</MessageBarBody>
                <MessageBarActions>
                  <Button onClick={() => void submit()}>{t('common:action.retry')}</Button>
                </MessageBarActions>
              </MessageBar>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={reverse.isPending}>
              {t('common:action.cancel')}
            </Button>
            <DangerButton onClick={() => void submit()} disabled={reverse.isPending}>
              {t('domain:incomingSkonto.reverse')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
