import { formatMoney } from '@bautakt/finance';
import { toast } from '@bautakt/ui';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Textarea,
} from '@fluentui/react-components';
import { AttachRegular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { useLegalFooterMissing } from '@/features/company/useLegalFooter';
import { useMailSettings } from '@/features/company/useMailSettings';
import { useMembership } from '@/features/company/useMembership';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { documentFileBaseName } from './archiveFiles';
import { attachmentFileName, parseRecipients } from './sendMail';
import { chargeableMinorOf, type SalesDocumentDetail } from './useSalesDocument';

type SendableDocument = Pick<
  SalesDocumentDetail,
  | 'id'
  | 'type'
  | 'document_number'
  | 'customer_label'
  | 'buyer_email'
  | 'due_date'
  | 'gross_total'
  | 'credited_total'
  | 'e_invoice'
  | 'einvoice_format'
>;

/** Fehlercodes von `finance-document-send` bzw. `mail-send` (#149). */
const SEND_ERRORS = new Set([
  'recipient_not_allowed',
  'legal_footer_incomplete',
  'send_limit_exceeded',
  'mail_not_configured',
  'provider_failed',
  'provider_outcome_unknown',
  'send_in_progress',
  'idempotency_conflict',
  'invalid_request',
  'forbidden',
]);

class SendError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

type SendBody = { to: string[]; subject: string; text: string };

/** Antwort von `mail-send` auf `preview: true`, durchgereicht von `finance-document-send`. */
type MailPreviewResult = {
  html: string;
  mode: string;
  from: string;
  replyTo: string | null;
  missingLegalFields: string[];
};

/** Antwort beim Versand; `bookkeeping`: Protokoll und Status danach. */
type SendResult = { mailId: string; mode: string; bookkeeping?: 'done' | 'failed' };

/** `finance-document-send` aufrufen; Fehler als `SendError` mit Code. */
async function invokeSend<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('finance-document-send', { body });
  if (!error) return data as T;
  // FunctionsHttpError trägt die Antwort der Function in `context`.
  const response: unknown = (error as { context?: unknown }).context;
  if (response instanceof Response) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (payload?.error && SEND_ERRORS.has(payload.error)) throw new SendError(payload.error);
  }
  throw new SendError('unknown');
}

/**
 * Vorschau vom Server (#186): genau die Mail, die `mail-send` verschicken
 * würde, mit Absender, Reply-To, Fußzeile und fehlenden Pflichtangaben.
 * Nichts wird archiviert oder versendet.
 */
function useMailPreview(documentId: string, body: SendBody, enabled: boolean) {
  return useQuery({
    queryKey: ['mail-preview', documentId, body],
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: () => invokeSend<MailPreviewResult>({ documentId, ...body, preview: true }),
  });
}

/**
 * Versand über `finance-document-send` (Strang A). Der Client schickt nur
 * Beleg, Empfänger, Betreff und Text; Absender, Reply-To, Modus und Anhang
 * (Archiv-Original) bestimmt der Server (Owner-Entscheidung 26.10.2026).
 * `idempotencyKey` je Bestätigung: Ein Retry versendet nicht doppelt.
 */
function useSendDocument(documentId: string) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useMutation({
    mutationFn: (body: SendBody & { idempotencyKey: string }) =>
      invokeSend<SendResult>({ documentId, ...body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales-document', companyId, documentId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
    },
  });
}

type Draft = { to: string; subject: string; text: string };

/**
 * „Per E-Mail versenden“ (#186): erst Empfänger, Betreff und Text, dann die
 * Vorschau der ganzen Mail mit Fußzeile und Anhang. Gesendet wird nur nach
 * ausdrücklicher Bestätigung in der Vorschau.
 *
 * Versandmodus aus `company_mail_settings` (#220): Im Probelauf und im
 * Testmodus steht ein Hinweis oben, im Testmodus mit den freigegebenen
 * Adressen. Bis AVV und Pilotvertrag stehen, lässt der Server höchstens
 * `allowlist` zu, auch wenn der Betrieb schon auf `live` steht.
 */
export function SendDialog({
  open,
  document,
  onClose,
}: {
  open: boolean;
  document: SendableDocument;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const companyName = membership?.companyName ?? '';
  const missing = useLegalFooterMissing();
  const mail = useMailSettings();
  const mailMode = mail.data?.mail_mode;
  const send = useSendDocument(document.id);

  const initialDraft = (): Draft => {
    const values = {
      number: document.document_number ?? '',
      company: companyName,
      amount: formatMoney(chargeableMinorOf(document)),
      dueDate: document.due_date ? formatDate(document.due_date) : '',
    };
    const kind =
      document.type === 'credit_note'
        ? 'creditNote'
        : document.type === 'quote'
          ? 'quote'
          : 'invoice';
    return {
      to: document.buyer_email ?? '',
      subject: t(`domain:send.template.${kind}.subject`, values),
      text: t(`domain:send.template.${kind}.${values.dueDate ? 'textWithDue' : 'text'}`, values),
    };
  };

  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [touched, setTouched] = useState(false);

  const recipients = parseRecipients(draft.to);
  const recipientError =
    recipients.invalid.length > 0
      ? t('domain:send.errors.invalidRecipient', { address: recipients.invalid.join(', ') })
      : recipients.valid.length === 0
        ? t('domain:send.errors.noRecipient')
        : undefined;
  const editInvalid = Boolean(recipientError) || !draft.subject.trim() || !draft.text.trim();
  const body: SendBody = {
    to: recipients.valid,
    subject: draft.subject.trim(),
    text: draft.text.trim(),
  };
  const preview = useMailPreview(document.id, body, open && step === 'preview');
  // Verbindlich ist, was der Server meldet; bis dahin die Prüfung der Firmendaten.
  const missingFields = preview.data?.missingLegalFields ?? missing.data ?? [];
  const previewErrorCode = preview.error instanceof SendError ? preview.error.code : null;
  const attachment = attachmentFileName(
    documentFileBaseName(document.document_number, document.customer_label),
    document,
  );

  function close() {
    if (send.isPending) return;
    onClose();
    // Beim nächsten Öffnen frisch aus der Vorlage.
    setDraft(initialDraft());
    setStep('edit');
    setConfirmed(false);
    setTouched(false);
    send.reset();
  }

  function toPreview() {
    setTouched(true);
    if (editInvalid) return;
    setIdempotencyKey(crypto.randomUUID());
    setConfirmed(false);
    send.reset();
    setStep('preview');
  }

  async function onSend() {
    try {
      const result = await send.mutateAsync({ ...body, idempotencyKey });
      const to = body.to.join(', ');
      if (result.mode === 'dry_run') toast.info(t('domain:send.result.dryRun'));
      else if (result.bookkeeping === 'failed')
        toast.warning(t('domain:send.result.sent', { to }), {
          description: t('domain:send.result.bookkeepingFailed'),
        });
      else toast.success(t('domain:send.result.sent', { to }));
      close();
    } catch {
      // Die Meldung steht im Dialog (send.error), der Dialog bleibt offen.
    }
  }

  const sendErrorCode = send.error instanceof SendError ? send.error.code : null;

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && close()}>
      <DialogSurface className="max-w-2xl">
        <DialogBody>
          <DialogTitle>
            {step === 'edit'
              ? t('domain:send.title', { number: document.document_number ?? '' })
              : t('domain:send.previewTitle')}
          </DialogTitle>
          <DialogContent className="flex flex-col gap-4">
            {mailMode === 'dry_run' ? (
              <MessageBar intent="info" layout="multiline">
                <MessageBarBody>
                  <MessageBarTitle>{t('domain:send.testMode.dryRunTitle')}</MessageBarTitle>
                  {t('domain:send.testMode.dryRunDescription')}
                </MessageBarBody>
              </MessageBar>
            ) : mailMode !== 'live' ? (
              <MessageBar intent="info" layout="multiline">
                <MessageBarBody>
                  <MessageBarTitle>{t('domain:send.testMode.title')}</MessageBarTitle>
                  {t('domain:send.testMode.description')}
                  {mail.data?.test_recipient_allowlist.length ? (
                    <>
                      {' '}
                      {t('domain:send.testMode.allowlist', {
                        addresses: mail.data.test_recipient_allowlist.join(', '),
                      })}
                    </>
                  ) : null}
                </MessageBarBody>
              </MessageBar>
            ) : null}

            {step === 'edit' ? (
              <>
                <Field
                  label={t('domain:send.to')}
                  required
                  hint={t('domain:send.toHint')}
                  validationMessage={touched ? recipientError : undefined}
                >
                  <Input
                    type="email"
                    value={draft.to}
                    onChange={(_, d) => setDraft({ ...draft, to: d.value })}
                  />
                </Field>
                <Field
                  label={t('domain:send.subject')}
                  required
                  validationMessage={
                    touched && !draft.subject.trim() ? t('domain:send.errors.subject') : undefined
                  }
                >
                  <Input
                    value={draft.subject}
                    onChange={(_, d) => setDraft({ ...draft, subject: d.value })}
                  />
                </Field>
                <Field
                  label={t('domain:send.text')}
                  required
                  validationMessage={
                    touched && !draft.text.trim() ? t('domain:send.errors.text') : undefined
                  }
                >
                  <Textarea
                    rows={9}
                    resize="vertical"
                    value={draft.text}
                    onChange={(_, d) => setDraft({ ...draft, text: d.value })}
                  />
                </Field>
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <AttachRegular aria-hidden />
                  {t('domain:send.attachment', { file: attachment })}
                </p>
              </>
            ) : (
              <>
                {preview.isLoading ? (
                  <div className="flex items-center gap-2 py-6">
                    <Spinner size="tiny" />
                    <span className="text-muted-foreground text-sm">
                      {t('domain:send.previewLoading')}
                    </span>
                  </div>
                ) : preview.data ? (
                  <MailPreview
                    preview={preview.data}
                    to={body.to}
                    subject={body.subject}
                    attachment={attachment}
                  />
                ) : (
                  <MessageBar intent="error" layout="multiline">
                    <MessageBarBody>
                      <MessageBarTitle>{t('domain:send.previewError')}</MessageBarTitle>
                      {t(`domain:send.errors.codes.${previewErrorCode ?? 'unknown'}`)}
                    </MessageBarBody>
                  </MessageBar>
                )}
              </>
            )}

            {step === 'preview' && missingFields.length > 0 ? (
              <MessageBar intent="error" layout="multiline">
                <MessageBarBody>
                  <MessageBarTitle>{t('domain:send.footerIncomplete')}</MessageBarTitle>
                  {missingFields
                    .map((field) => t(`domain:settings.register.fields.${field}`))
                    .join(', ')}{' '}
                  <RouterLink to={routes.settings} className="font-medium">
                    {t('domain:invoices.toSettings')}
                  </RouterLink>
                </MessageBarBody>
              </MessageBar>
            ) : null}

            {step === 'preview' && preview.data && missingFields.length === 0 ? (
              <Checkbox
                checked={confirmed}
                disabled={send.isPending}
                onChange={(_, d) => setConfirmed(Boolean(d.checked))}
                label={t('domain:send.confirm')}
              />
            ) : null}

            {sendErrorCode ? (
              <MessageBar intent="error" role="alert" layout="multiline">
                <MessageBarBody>
                  <MessageBarTitle>{t('domain:send.errors.title')}</MessageBarTitle>
                  {t(`domain:send.errors.codes.${sendErrorCode}`)}
                </MessageBarBody>
              </MessageBar>
            ) : null}
          </DialogContent>
          <DialogActions>
            {step === 'edit' ? (
              <>
                <Button onClick={close}>{t('common:action.cancel')}</Button>
                <Button appearance="primary" onClick={toPreview}>
                  {t('domain:send.toPreview')}
                </Button>
              </>
            ) : (
              <>
                <Button disabled={send.isPending} onClick={() => setStep('edit')}>
                  {t('domain:send.back')}
                </Button>
                <Button
                  appearance="primary"
                  disabled={
                    !confirmed || !preview.data || missingFields.length > 0 || send.isPending
                  }
                  aria-busy={send.isPending}
                  icon={send.isPending ? <Spinner size="tiny" /> : undefined}
                  onClick={() => void onSend()}
                >
                  {t('domain:send.send')}
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

/**
 * Die Mail, wie der Empfänger sie sieht: Kopf aus der Server-Vorschau, der
 * Inhalt samt Fußzeile als HTML von `mail-send` in einem abgeschotteten
 * iframe (kein Skript, keine Formulare, kein Zugriff auf die Seite).
 */
function MailPreview({
  preview,
  to,
  subject,
  attachment,
}: {
  preview: MailPreviewResult;
  to: string[];
  subject: string;
  attachment: string;
}) {
  const { t } = useTranslation();
  const rows: [string, string][] = [
    [t('domain:send.preview.from'), preview.from],
    [t('domain:send.preview.replyTo'), preview.replyTo ?? '–'],
    [t('domain:send.to'), to.join(', ')],
    [t('domain:send.subject'), subject],
  ];
  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <dl className="bg-muted border-border grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 border-b px-4 py-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <iframe
        title={t('domain:send.previewTitle')}
        sandbox=""
        srcDoc={preview.html}
        className="block h-80 w-full bg-white"
      />
      <p className="text-muted-foreground border-border flex items-center gap-2 border-t px-4 py-3 text-sm">
        <AttachRegular aria-hidden />
        {attachment}
      </p>
    </div>
  );
}
