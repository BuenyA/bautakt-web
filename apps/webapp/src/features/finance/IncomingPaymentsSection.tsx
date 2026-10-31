import {
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
import {
  canRecordPayment,
  canReversePayment,
  MAX_PAYMENT_METHOD,
  MAX_PAYMENT_TEXT,
  type PaymentEntry,
  paymentErrors,
  reversedIds,
  reverseReasonError,
} from './incomingPayments';
import type { IncomingReviewStatus } from './incomingReview';
import {
  useIncomingBalance,
  useIncomingPayments,
  useRecordPayment,
  useReversePayment,
} from './useIncomingPayments';

/**
 * Zahlungen einer erfassten Eingangsrechnung (#270): Zahlbetrag, gezahlt,
 * offen, jede Zahlung und jedes Storno. Zahlungen sind unveränderbar,
 * korrigiert wird per Storno mit Begründung. Erfassen darf, wer Gemeinkosten
 * verwaltet; das Recht prüft die Datenbank noch einmal.
 */
export function IncomingPaymentsSection({
  invoiceId,
  status,
  reviewStatus,
}: {
  invoiceId: string;
  status: IncomingInvoiceStatus;
  reviewStatus: IncomingReviewStatus;
}) {
  const { t } = useTranslation();
  const canManage = usePermission('canManageOverheadCosts');
  const payments = useIncomingPayments(invoiceId);
  const balance = useIncomingBalance(invoiceId);
  const [recording, setRecording] = useState(false);
  const [reversing, setReversing] = useState<PaymentEntry | null>(null);

  if (payments.isPending || balance.isPending) return <Spinner size="tiny" />;
  if (payments.isError || balance.isError) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          {readableDbError(payments.error ?? balance.error) ??
            t('domain:incomingPayments.loadError')}
        </MessageBarBody>
        <MessageBarActions>
          <Button
            onClick={() => {
              if (payments.isError) void payments.refetch();
              if (balance.isError) void balance.refetch();
            }}
          >
            {t('common:action.retry')}
          </Button>
        </MessageBarActions>
      </MessageBar>
    );
  }

  const { payableMinor, paidMinor, openMinor } = balance.data;
  const canRecord = canRecordPayment(status, reviewStatus, openMinor);

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        <dt className="text-muted-foreground text-sm">{t('domain:incomingPayments.payable')}</dt>
        <dd className="text-sm tabular-nums">{formatMoney(payableMinor)}</dd>
        <dt className="text-muted-foreground text-sm">{t('domain:incomingPayments.paid')}</dt>
        <dd className="text-sm tabular-nums">{formatMoney(paidMinor)}</dd>
        <dt className="text-sm font-semibold">{t('domain:incomingPayments.open')}</dt>
        <dd className="text-sm font-semibold tabular-nums">{formatMoney(openMinor)}</dd>
      </dl>

      {reviewStatus !== 'approved' ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:incomingPayments.notApproved')}
        </Text>
      ) : paidMinor > 0 && openMinor <= 0 ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:incomingPayments.fullyPaid')}
        </Text>
      ) : null}

      {canManage && canRecord ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" icon={<AddRegular />} onClick={() => setRecording(true)}>
            {t('domain:incomingPayments.record')}
          </Button>
        </div>
      ) : null}

      {payments.data.length > 0 ? (
        <PaymentList
          entries={payments.data}
          canReverse={(entry) => canManage && canReversePayment(entry, payments.data, reviewStatus)}
          onReverse={setReversing}
        />
      ) : (
        <Text size={200} className="text-muted-foreground">
          {t('domain:incomingPayments.empty')}
        </Text>
      )}
      <Text size={200} className="text-muted-foreground">
        {t('domain:incomingPayments.hint')}
      </Text>

      {recording ? (
        <RecordPaymentDialog
          invoiceId={invoiceId}
          openMinor={openMinor}
          onClose={() => setRecording(false)}
        />
      ) : null}
      {reversing ? (
        <ReversePaymentDialog
          invoiceId={invoiceId}
          entry={reversing}
          onClose={() => setReversing(null)}
        />
      ) : null}
    </div>
  );
}

/** Jede Zahlung und jedes Storno, unveränderbar, in der Reihenfolge der Erfassung. */
function PaymentList({
  entries,
  canReverse,
  onReverse,
}: {
  entries: PaymentEntry[];
  canReverse: (entry: PaymentEntry) => boolean;
  onReverse: (entry: PaymentEntry) => void;
}) {
  const { t } = useTranslation();
  const reversed = reversedIds(entries);
  return (
    <ol className="border-border flex flex-col gap-3 border-l pl-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <Text
                size={200}
                weight="semibold"
                className={`tabular-nums ${reversed.has(entry.id) ? 'line-through' : ''}`}
              >
                {entry.reverses_id
                  ? t('domain:incomingPayments.reversal', {
                      amount: formatMoney(-entry.amountMinor),
                    })
                  : t('domain:incomingPayments.entry', {
                      amount: formatMoney(entry.amountMinor),
                      date: formatIsoDateDe(entry.paid_at),
                    })}
              </Text>
              {reversed.has(entry.id) ? (
                <Badge appearance="tint" color="informative" size="small">
                  {t('domain:incomingPayments.reversedBadge')}
                </Badge>
              ) : null}
              {entry.method ? (
                <Text size={200} className="text-muted-foreground">
                  {entry.method}
                </Text>
              ) : null}
            </div>
            <Text size={200} className="text-muted-foreground">
              {t('domain:incomingPayments.by', {
                name: entry.actor_name || t('domain:incomingReview.unknownActor'),
                at: formatDateTime(entry.created_at),
              })}
            </Text>
            {entry.note ? (
              <Text size={200} className="whitespace-pre-wrap">
                {entry.note}
              </Text>
            ) : null}
            {entry.reason ? (
              <Text size={200} className="whitespace-pre-wrap">
                {entry.reason}
              </Text>
            ) : null}
          </div>
          {canReverse(entry) ? (
            <Button
              type="button"
              size="small"
              icon={<ArrowUndoRegular />}
              onClick={() => onReverse(entry)}
            >
              {t('domain:incomingPayments.reverse')}
            </Button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function RecordPaymentDialog({
  invoiceId,
  openMinor,
  onClose,
}: {
  invoiceId: string;
  openMinor: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const record = useRecordPayment(invoiceId);
  const today = todayIso();
  const [paidAt, setPaidAt] = useState(today);
  const [amount, setAmount] = useState(formatMoneyInput(fromMinorUnits(openMinor)));
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountMinor = parseMoneyInput(amount);
  const errors = paymentErrors(openMinor, { amountMinor, paidAt, method, note }, today);
  const message = (key: keyof typeof errors) =>
    showErrors && errors[key]
      ? t(`domain:incomingPayments.errors.${errors[key]}`, {
          open: formatMoney(openMinor),
          max: key === 'method' ? MAX_PAYMENT_METHOD : MAX_PAYMENT_TEXT,
        })
      : undefined;

  async function submit() {
    setShowErrors(true);
    setError(null);
    if (Object.keys(errors).length > 0 || amountMinor === null) return;
    try {
      await record.mutateAsync({ paidAt, amountMinor, method, note });
      toast.success(t('domain:incomingPayments.recorded'));
      onClose();
    } catch (caught) {
      console.error('Zahlung nicht gespeichert', caught);
      setError(readableDbError(caught) ?? t('domain:incomingPayments.saveError'));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open && !record.isPending) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:incomingPayments.dialog.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-4">
            <Text>
              {t('domain:incomingPayments.dialog.text', { open: formatMoney(openMinor) })}
            </Text>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('domain:incomingPayments.dialog.paidAt')}
                required
                validationMessage={message('paidAt')}
              >
                <DatePicker
                  value={paidAt}
                  onChange={setPaidAt}
                  aria-label={t('domain:incomingPayments.dialog.paidAt')}
                />
              </Field>
              <Field
                label={t('domain:incomingPayments.dialog.amount')}
                required
                validationMessage={message('amount')}
              >
                <Input
                  inputMode="decimal"
                  value={amount}
                  contentAfter="€"
                  onChange={(_, data) => setAmount(data.value)}
                />
              </Field>
              <Field
                label={t('domain:incomingPayments.dialog.method')}
                hint={t('domain:incomingPayments.dialog.methodHint')}
                validationMessage={message('method')}
                className="sm:col-span-2"
              >
                <Input
                  value={method}
                  maxLength={MAX_PAYMENT_METHOD}
                  onChange={(_, data) => setMethod(data.value)}
                />
              </Field>
            </div>
            <Field
              label={t('domain:incomingPayments.dialog.note')}
              validationMessage={message('note')}
            >
              <Textarea
                rows={2}
                value={note}
                maxLength={MAX_PAYMENT_TEXT}
                onChange={(_, data) => setNote(data.value)}
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
            <Button onClick={onClose} disabled={record.isPending}>
              {t('common:action.cancel')}
            </Button>
            <Button appearance="primary" onClick={() => void submit()} disabled={record.isPending}>
              {t('domain:incomingPayments.dialog.submit')}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function ReversePaymentDialog({
  invoiceId,
  entry,
  onClose,
}: {
  invoiceId: string;
  entry: PaymentEntry;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const reverse = useReversePayment(invoiceId);
  const [reason, setReason] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = reverseReasonError(reason);

  async function submit() {
    setShowErrors(true);
    setError(null);
    if (problem) return;
    try {
      await reverse.mutateAsync({ paymentId: entry.id, reason });
      toast.success(t('domain:incomingPayments.reversed'));
      onClose();
    } catch (caught) {
      console.error('Storno der Zahlung nicht gespeichert', caught);
      setError(readableDbError(caught) ?? t('domain:incomingPayments.saveError'));
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
          <DialogTitle>{t('domain:incomingPayments.reverseDialog.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-4">
            <Text>
              {t('domain:incomingPayments.reverseDialog.text', {
                amount: formatMoney(entry.amountMinor),
                date: formatIsoDateDe(entry.paid_at),
              })}
            </Text>
            <Field
              label={t('domain:incomingPayments.reverseDialog.reason')}
              required
              validationMessage={
                showErrors && problem
                  ? t(`domain:incomingPayments.errors.${problem}`, { max: MAX_PAYMENT_TEXT })
                  : undefined
              }
            >
              <Textarea
                rows={3}
                value={reason}
                maxLength={MAX_PAYMENT_TEXT}
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
              {t('domain:incomingPayments.reverse')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
