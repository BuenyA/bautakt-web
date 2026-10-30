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
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { CheckmarkRegular, DismissRegular, MailRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePermission } from '@/features/company/usePermission';
import { readableDbError } from '@/lib/dbErrors';
import { formatDateTime } from '@/lib/format';

import type { IncomingInvoiceStatus } from './incomingInvoiceForm';
import {
  canReview,
  type IncomingReviewDecision,
  type IncomingReviewStatus,
  MAX_REVIEW_REASON,
  reviewReasonError,
} from './incomingReview';
import { rejectionReason } from './rejectionMail';
import {
  MailPreviewFrame,
  type RejectableInvoice,
  RejectionMailDialog,
} from './RejectionMailDialog';
import { useIncomingInvoiceEvents, useReviewIncomingInvoice } from './useIncomingInvoice';
import { type ArchivedMail, useRejectionMails } from './useRejectionMail';

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
          onClose={() => setMailReason(null)}
        />
      ) : null}
    </div>
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
                {t(`domain:incomingReview.action.${event.action}`)}
              </Text>
              <Text size={200} className="text-muted-foreground">
                {t('domain:incomingReview.by', {
                  name: event.actor_name || t('domain:incomingReview.unknownActor'),
                  at: formatDateTime(event.created_at),
                })}
              </Text>
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
      <Button appearance="transparent" size="small" className="!px-0" onClick={() => onShow(mail)}>
        {t('domain:rejectionMail.log.show')}
      </Button>
    </div>
  );
}

/** Die archivierte Mail, wie sie rausging (`mail_messages`). */
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
