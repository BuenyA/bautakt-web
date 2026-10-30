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
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { CheckmarkRegular, DismissRegular, MailRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePermission } from '@/features/company/usePermission';
import { useContacts } from '@/features/contacts/useContacts';
import { useOrders } from '@/features/orders/useOrders';
import { readableDbError } from '@/lib/dbErrors';
import { formatDateTime } from '@/lib/format';

import type { IncomingInvoiceStatus } from './incomingInvoiceForm';
import {
  type AssignmentField,
  canReview,
  incomingInvoiceChange,
  type IncomingInvoiceEvent,
  type IncomingReviewDecision,
  type IncomingReviewStatus,
  MAX_REVIEW_REASON,
  reviewReasonError,
} from './incomingReview';
import { type MailDelivery, mailDelivery, type MailIssue, openMailIssues } from './mailDelivery';
import { rejectionReason } from './rejectionMail';
import {
  MailPreviewFrame,
  type RejectableInvoice,
  RejectionMailDialog,
  type RejectionRetry,
} from './RejectionMailDialog';
import { useCostCategories } from './useCostCategories';
import { useIncomingInvoiceEvents, useReviewIncomingInvoice } from './useIncomingInvoice';
import { type ArchivedMail, useRecordRejectionMail, useRejectionMails } from './useRejectionMail';

const REVIEW_BADGE = {
  in_review: 'warning',
  approved: 'success',
  rejected: 'danger',
} as const satisfies Record<IncomingReviewStatus, 'warning' | 'success' | 'danger'>;

/**
 * Prüfstand, Freigeben/Ablehnen und Protokoll einer erfassten Eingangsrechnung
 * (bautakt-web#164). Entscheiden darf, wer Gemeinkosten verwaltet; das Recht
 * prüft `review_incoming_invoice` noch einmal.
 *
 * Nach dem Ablehnen öffnet sich die Ablehnungs-Mail an den Absender (#165);
 * sie lässt sich überspringen und über „Ablehnungs-Mail senden“ nachholen.
 * Fehlversuche und versendete Mails ohne Protokolleintrag stehen darüber,
 * bis sie erledigt sind (#171).
 */
export function IncomingReviewSection({
  invoice,
  status,
  reviewStatus,
}: {
  invoice: RejectableInvoice;
  status: IncomingInvoiceStatus;
  reviewStatus: IncomingReviewStatus;
}) {
  const { t } = useTranslation();
  const canManage = usePermission('canManageOverheadCosts');
  const invoiceId = invoice.id;
  const events = useIncomingInvoiceEvents(invoiceId);
  const [decision, setDecision] = useState<IncomingReviewDecision | null>(null);
  // Begründung für die Mail: direkt nach dem Ablehnen die eben eingegebene,
  // später die jüngste aus dem Protokoll. `null` = Dialog zu.
  const [mailReason, setMailReason] = useState<string | null>(null);
  const [mailRetry, setMailRetry] = useState<RejectionRetry | undefined>(undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge appearance="tint" color={REVIEW_BADGE[reviewStatus]}>
          {t(`domain:incomingReview.status.${reviewStatus}`)}
        </Badge>
        {canManage && canReview(status, reviewStatus) ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" icon={<DismissRegular />} onClick={() => setDecision('rejected')}>
              {t('domain:incomingReview.reject')}
            </Button>
            <Button
              type="button"
              icon={<CheckmarkRegular />}
              onClick={() => setDecision('approved')}
            >
              {t('domain:incomingReview.approve')}
            </Button>
          </div>
        ) : null}
        {canManage && reviewStatus === 'rejected' ? (
          <Button
            type="button"
            icon={<MailRegular />}
            disabled={events.isPending}
            onClick={() => setMailReason(rejectionReason(events.data ?? []))}
          >
            {t('domain:rejectionMail.action')}
          </Button>
        ) : null}
      </div>
      {reviewStatus === 'rejected' ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:incomingReview.rejectedHint')}
        </Text>
      ) : null}

      {canManage && reviewStatus === 'rejected' ? (
        <RejectionMailIssues
          invoiceId={invoiceId}
          loggedMailIds={
            new Set(
              (events.data ?? []).flatMap((event) =>
                event.action === 'mail_sent' && event.mail_reference ? [event.mail_reference] : [],
              ),
            )
          }
          eventsReady={events.isSuccess}
          onResend={(mail) => {
            setMailRetry({ to: mail.to_addresses, subject: mail.subject });
            setMailReason(rejectionReason(events.data ?? []));
          }}
        />
      ) : null}

      <ReviewLog invoiceId={invoiceId} />

      {decision ? (
        <DecisionDialog
          invoiceId={invoiceId}
          decision={decision}
          onClose={() => setDecision(null)}
          onRejected={setMailReason}
        />
      ) : null}

      {mailReason !== null ? (
        <RejectionMailDialog
          invoice={invoice}
          reason={mailReason}
          retry={mailRetry}
          onClose={() => {
            setMailReason(null);
            setMailRetry(undefined);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Offene Punkte beim Mailversand: Fehlversuche, Mails mit unklarem Ausgang und
 * versendete Mails ohne Eintrag im Prüfprotokoll. Nichts geht still verloren;
 * jede Mail steht unveränderbar im Archiv, auch die gescheiterten.
 */
function RejectionMailIssues({
  invoiceId,
  loggedMailIds,
  eventsReady,
  onResend,
}: {
  invoiceId: string;
  loggedMailIds: ReadonlySet<string>;
  eventsReady: boolean;
  onResend: (mail: ArchivedMail) => void;
}) {
  const { t } = useTranslation();
  const mails = useRejectionMails(invoiceId, true);
  const record = useRecordRejectionMail(invoiceId);
  const [shownMail, setShownMail] = useState<ArchivedMail | null>(null);

  if (mails.isPending || !eventsReady) return null;
  if (mails.isError) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>{t('domain:rejectionMail.issues.loadError')}</MessageBarBody>
        <MessageBarActions>
          <Button onClick={() => void mails.refetch()}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      </MessageBar>
    );
  }

  const now = new Date().toISOString();
  const withDelivery = mails.data.map((mail) => ({
    mail,
    delivery: mailDelivery(mail.created_at, mail.events, now),
  }));
  const issues = openMailIssues(
    withDelivery.map(({ mail, delivery }) => ({
      id: mail.id,
      created_at: mail.created_at,
      delivery,
    })),
    loggedMailIds,
  );
  if (issues.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {issues.map((issue) => {
        const entry = withDelivery.find(({ mail }) => mail.id === issue.mailId)!;
        return (
          <MailIssueBar
            key={issue.mailId}
            issue={issue}
            mail={entry.mail}
            delivery={entry.delivery}
            recording={record.isPending && record.variables === issue.mailId}
            onShow={() => setShownMail(entry.mail)}
            onResend={() => onResend(entry.mail)}
            onRecord={() =>
              record.mutate(issue.mailId, {
                onError: (error) =>
                  console.error('Ablehnungs-Mail: Protokolleintrag nachtragen', error),
              })
            }
          />
        );
      })}
      {record.isError ? (
        <MessageBar intent="error" role="alert">
          <MessageBarBody>
            {readableDbError(record.error) ?? t('domain:rejectionMail.issues.recordError')}
          </MessageBarBody>
          <MessageBarActions>
            <Button
              disabled={record.isPending}
              onClick={() => record.variables && record.mutate(record.variables)}
            >
              {t('common:action.retry')}
            </Button>
          </MessageBarActions>
        </MessageBar>
      ) : null}
      {shownMail ? (
        <ArchivedMailDialog mail={shownMail} onClose={() => setShownMail(null)} />
      ) : null}
    </div>
  );
}

function MailIssueBar({
  issue,
  mail,
  delivery,
  recording,
  onShow,
  onResend,
  onRecord,
}: {
  issue: MailIssue;
  mail: ArchivedMail;
  delivery: MailDelivery;
  recording: boolean;
  onShow: () => void;
  onResend: () => void;
  onRecord: () => void;
}) {
  const { t } = useTranslation();
  const to = mail.to_addresses.join(', ');
  const at = formatDateTime('at' in delivery ? delivery.at : mail.created_at);
  return (
    <MessageBar intent={issue.kind === 'failed' ? 'error' : 'warning'} layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>{t(`domain:rejectionMail.issues.${issue.kind}.title`)}</MessageBarTitle>
        {t(`domain:rejectionMail.issues.${issue.kind}.body`, { to, at })}
        {delivery.state === 'failed' ? (
          <> {t('domain:rejectionMail.issues.errorCode', { code: delivery.errorCode })}</>
        ) : null}
      </MessageBarBody>
      <MessageBarActions>
        <Button onClick={onShow}>{t('domain:rejectionMail.log.show')}</Button>
        {issue.kind === 'unlogged' ? (
          <Button disabled={recording} aria-busy={recording} onClick={onRecord}>
            {t('domain:rejectionMail.issues.record')}
          </Button>
        ) : (
          <Button icon={<MailRegular />} onClick={onResend}>
            {t('domain:rejectionMail.issues.resend')}
          </Button>
        )}
      </MessageBarActions>
    </MessageBar>
  );
}

function ReviewLog({ invoiceId }: { invoiceId: string }) {
  const { t } = useTranslation();
  const events = useIncomingInvoiceEvents(invoiceId);
  const hasMail = Boolean(events.data?.some((event) => event.action === 'mail_sent'));
  // Empfänger, Betreff und Text stehen unveränderbar im Mail-Archiv.
  const mails = useRejectionMails(invoiceId, hasMail);
  const [shownMail, setShownMail] = useState<ArchivedMail | null>(null);

  if (events.isPending) return <Spinner size="tiny" />;
  if (events.isError) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          {readableDbError(events.error) ?? t('domain:incomingReview.logError')}
        </MessageBarBody>
        <MessageBarActions>
          <Button onClick={() => void events.refetch()}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      </MessageBar>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Text as="h3" size={300} weight="semibold">
        {t('domain:incomingReview.log')}
      </Text>
      {events.data.length === 0 ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:incomingReview.logEmpty')}
        </Text>
      ) : (
        <ol className="border-border flex flex-col gap-3 border-l pl-4">
          {events.data.map((event) => (
            <li key={event.id} className="flex flex-col gap-0.5">
              <Text size={200} weight="semibold">
                {t(`domain:incomingReview.action.${event.action}`, {
                  defaultValue: t('domain:incomingReview.action.unknown'),
                })}
              </Text>
              <Text size={200} className="text-muted-foreground">
                {t('domain:incomingReview.by', {
                  name: event.actor_name || t('domain:incomingReview.unknownActor'),
                  at: formatDateTime(event.created_at),
                })}
              </Text>
              <EventChange event={event} />
              {event.reason ? (
                <Text size={200} className="whitespace-pre-wrap">
                  {event.reason}
                </Text>
              ) : null}
              {event.action === 'mail_sent' ? (
                <MailLogDetails
                  mail={mails.data?.find((mail) => mail.id === event.mail_reference) ?? null}
                  loading={mails.isPending}
                  failed={mails.isError}
                  onRetry={() => void mails.refetch()}
                  onShow={setShownMail}
                />
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {shownMail ? (
        <ArchivedMailDialog mail={shownMail} onClose={() => setShownMail(null)} />
      ) : null}
    </div>
  );
}

/** Alter und neuer Wert eines Protokolleintrags (#170). */
function EventChange({ event }: { event: IncomingInvoiceEvent }) {
  const { t } = useTranslation();
  const change = incomingInvoiceChange(event);
  if (!change) return null;
  if (change.kind === 'assignment') {
    return <AssignmentChange field={change.field} from={change.from} to={change.to} />;
  }
  const to = t(`domain:incomingInvoiceStatus.${change.to}`);
  return (
    <Text size={200}>
      {change.from
        ? t('domain:incomingReview.change.status', {
            from: t(`domain:incomingInvoiceStatus.${change.from}`),
            to,
          })
        : t('domain:incomingReview.change.statusInitial', { to })}
    </Text>
  );
}

/**
 * Zuordnung mit Namen statt IDs. Die Listen kommen aus dem Cache der
 * Erfassungsseite; ein gelöschter Eintrag heißt „nicht mehr vorhanden“.
 */
function AssignmentChange({
  field,
  from,
  to,
}: {
  field: AssignmentField;
  from: string | null;
  to: string | null;
}) {
  const { t } = useTranslation();
  const categories = useCostCategories();
  const orders = useOrders({ enabled: field === 'order_id' });
  const contacts = useContacts();
  const list = field === 'order_id' ? orders : field === 'cost_category_id' ? categories : contacts;

  function label(id: string | null): string {
    if (id === null) return t('domain:incomingReview.change.none');
    if (!list.isSuccess) return '…';
    const rows: readonly { id: string; name: string }[] = list.data;
    return rows.find((row) => row.id === id)?.name ?? t('domain:incomingReview.change.missing');
  }

  return (
    <Text size={200}>
      {t(`domain:incomingReview.change.field.${field}`, { from: label(from), to: label(to) })}
    </Text>
  );
}

function MailLogDetails({
  mail,
  loading,
  failed,
  onRetry,
  onShow,
}: {
  mail: ArchivedMail | null;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  onShow: (mail: ArchivedMail) => void;
}) {
  const { t } = useTranslation();
  if (loading) return <Spinner size="extra-tiny" className="self-start" />;
  if (failed) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>{t('domain:rejectionMail.log.loadError')}</MessageBarBody>
        <MessageBarActions>
          <Button onClick={onRetry}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      </MessageBar>
    );
  }
  if (!mail) return null;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <Text size={200}>
        {t('domain:rejectionMail.log.to', { to: mail.to_addresses.join(', ') })}
      </Text>
      <Text size={200}>{t('domain:rejectionMail.log.subject', { subject: mail.subject })}</Text>
      <DeliveryProof mail={mail} />
      <Button appearance="transparent" size="small" className="!px-0" onClick={() => onShow(mail)}>
        {t('domain:rejectionMail.log.show')}
      </Button>
    </div>
  );
}

/**
 * Versandnachweis: wann der Mail-Dienst die Mail angenommen hat und unter
 * welcher Message-ID; im Testmodus mit Hinweis.
 */
function DeliveryProof({ mail }: { mail: ArchivedMail }) {
  const { t } = useTranslation();
  const delivery = mailDelivery(mail.created_at, mail.events, new Date().toISOString());
  if (delivery.state !== 'sent') return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <Text size={200} className="text-muted-foreground">
        {t('domain:rejectionMail.log.sentAt', { at: formatDateTime(delivery.at) })}
      </Text>
      <Text size={200} className="text-muted-foreground break-all">
        {t('domain:rejectionMail.log.messageId', { id: delivery.providerMessageId })}
      </Text>
      {mail.mode !== 'live' ? (
        <Badge appearance="tint" color="informative" size="small">
          {t('domain:send.testMode.title')}
        </Badge>
      ) : null}
    </div>
  );
}

/** Die archivierte Mail, wie sie gespeichert ist (`mail_messages`). */
function ArchivedMailDialog({ mail, onClose }: { mail: ArchivedMail; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className="max-w-2xl">
        <DialogBody>
          <DialogTitle>
            {t('domain:rejectionMail.log.archivedTitle', { at: formatDateTime(mail.created_at) })}
          </DialogTitle>
          <DialogContent>
            <MailPreviewFrame preview={mail} to={mail.to_addresses} subject={mail.subject} />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{t('common:action.close')}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function DecisionDialog({
  invoiceId,
  decision,
  onClose,
  onRejected,
}: {
  invoiceId: string;
  decision: IncomingReviewDecision;
  onClose: () => void;
  /** Nach erfolgreichem Ablehnen, mit der Begründung für die Mail. */
  onRejected: (reason: string) => void;
}) {
  const { t } = useTranslation();
  const review = useReviewIncomingInvoice();
  const [reason, setReason] = useState('');
  const [showProblem, setShowProblem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = reviewReasonError(decision, reason);

  async function submit() {
    setShowProblem(true);
    setError(null);
    if (problem) return;
    try {
      await review.mutateAsync({ id: invoiceId, decision, reason });
      toast.success(t(`domain:incomingReview.done.${decision}`));
      onClose();
      if (decision === 'rejected') onRejected(reason.trim());
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:incomingReview.saveError'));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open && !review.isPending) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t(`domain:incomingReview.dialog.${decision}.title`)}</DialogTitle>
          <DialogContent className="flex flex-col gap-4">
            <Text>{t(`domain:incomingReview.dialog.${decision}.text`)}</Text>
            <Field
              label={t(`domain:incomingReview.dialog.${decision}.reason`)}
              required={decision === 'rejected'}
              validationMessage={
                showProblem && problem
                  ? t(`domain:incomingReview.errors.${problem}`, { max: MAX_REVIEW_REASON })
                  : undefined
              }
            >
              <Textarea
                rows={4}
                value={reason}
                maxLength={MAX_REVIEW_REASON}
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
            <Button onClick={onClose} disabled={review.isPending}>
              {t('common:action.cancel')}
            </Button>
            {decision === 'rejected' ? (
              <DangerButton onClick={() => void submit()} disabled={review.isPending}>
                {t('domain:incomingReview.reject')}
              </DangerButton>
            ) : (
              <Button
                appearance="primary"
                onClick={() => void submit()}
                disabled={review.isPending}
              >
                {t('domain:incomingReview.approve')}
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
