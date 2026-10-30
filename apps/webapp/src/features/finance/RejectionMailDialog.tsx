import { formatMoney, toMinorUnits } from '@bautakt/finance';
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
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { EditRegular } from '@fluentui/react-icons';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { useMailSettings } from '@/features/company/useMailSettings';
import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import {
  fillTemplate,
  isSameTemplate,
  type MailTemplate,
  MAX_TEMPLATE_BODY,
  MAX_TEMPLATE_SUBJECT,
  REJECTION_PLACEHOLDERS,
  type RejectionValues,
  templateErrors,
  unknownPlaceholders,
} from './rejectionMail';
import { parseRecipients } from './sendMail';
import type { IncomingInvoiceRow } from './useIncomingInvoice';
import {
  type RejectionBody,
  type RejectionPreview,
  RejectionSendError,
  useRejectionPreview,
  useRejectionRecipient,
  useRejectionTemplate,
  useSaveRejectionTemplate,
  useSendRejectionMail,
} from './useRejectionMail';

export type RejectableInvoice = Pick<
  IncomingInvoiceRow,
  | 'id'
  | 'vendor_name'
  | 'invoice_number'
  | 'invoice_date'
  | 'gross_total'
  | 'supplier_id'
  | 'storage_path'
  | 'source_format'
>;

type Draft = { to: string; subject: string; text: string };

export type RejectionRetry = { to: string[]; subject: string };

/** Die eingebaute Vorlage, solange der Betrieb keine eigene gespeichert hat. */
function useBuiltinTemplate(): MailTemplate {
  const { t } = useTranslation();
  return {
    subject: t('domain:rejectionMail.template.subject'),
    body: t('domain:rejectionMail.template.body'),
  };
}

/**
 * Fehler, bei denen derselbe Versand später klappen kann. Bei allen anderen
 * hilft nur, Empfänger, Text oder Einstellungen zu ändern; bei
 * `provider_outcome_unknown` darf es keinen blinden zweiten Versuch geben.
 */
const RETRYABLE = new Set([
  'provider_failed',
  'send_in_progress',
  'send_limit_exceeded',
  'unknown',
]);

function errorText(t: TFunction, code: string): string {
  // Eigene Texte für die Eingangsseite, sonst dieselben wie beim Belegversand.
  return t(`domain:rejectionMail.errors.codes.${code}`, {
    defaultValue: t(`domain:send.errors.codes.${code}`, {
      defaultValue: t('domain:send.errors.codes.unknown'),
    }),
  });
}

/**
 * Ablehnungs-Mail an den Absender einer abgelehnten Eingangsrechnung
 * (bautakt-web#165). Wie „Per E-Mail versenden“ bei Ausgangsbelegen: erst
 * Empfänger, Betreff und Text aus der Vorlage, dann die Vorschau vom Server
 * mit Fußzeile. Gesendet wird nur nach ausdrücklicher Bestätigung; danach
 * steht die Mail im Prüfprotokoll.
 *
 * `retry`: neuer Versuch nach einem Fehlversuch (#171), mit dessen Empfängern
 * und Betreff. Es ist eine neue Mail mit neuer Bestätigung; der Fehlversuch
 * bleibt im Archiv.
 */
export function RejectionMailDialog({
  invoice,
  reason,
  retry,
  onClose,
}: {
  invoice: RejectableInvoice;
  reason: string;
  retry?: RejectionRetry;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const template = useRejectionTemplate();
  const recipient = useRejectionRecipient(invoice);
  const builtin = useBuiltinTemplate();

  const ready = !template.isPending && !recipient.isPending;
  const values: RejectionValues = {
    rechnungsnummer: invoice.invoice_number,
    rechnungsdatum: formatDate(invoice.invoice_date),
    betrag: formatMoney(toMinorUnits(invoice.gross_total)),
    lieferant: invoice.vendor_name,
    grund: reason,
    firma: membership?.companyName ?? '',
  };

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
    >
      <DialogSurface className="max-w-2xl">
        {template.isError ? (
          <DialogBody>
            <DialogTitle>{t('domain:rejectionMail.title')}</DialogTitle>
            <DialogContent>
              <MessageBar intent="error" layout="multiline">
                <MessageBarBody>
                  {readableDbError(template.error) ?? t('domain:rejectionMail.templateLoadError')}
                </MessageBarBody>
                <MessageBarActions>
                  <Button onClick={() => void template.refetch()}>
                    {t('common:action.retry')}
                  </Button>
                </MessageBarActions>
              </MessageBar>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>{t('common:action.cancel')}</Button>
            </DialogActions>
          </DialogBody>
        ) : !ready ? (
          <DialogBody>
            <DialogTitle>{t('domain:rejectionMail.title')}</DialogTitle>
            <DialogContent>
              <div className="flex items-center gap-2 py-6">
                <Spinner size="tiny" />
                <Text size={200} className="text-muted-foreground">
                  {t('domain:rejectionMail.preparing')}
                </Text>
              </div>
            </DialogContent>
          </DialogBody>
        ) : (
          <RejectionMailForm
            invoice={invoice}
            values={values}
            template={template.data ?? builtin}
            customTemplate={Boolean(template.data)}
            recipient={recipient.data ?? { address: '', source: null }}
            retry={retry}
            onClose={onClose}
          />
        )}
      </DialogSurface>
    </Dialog>
  );
}

function RejectionMailForm({
  invoice,
  values,
  template,
  customTemplate,
  recipient,
  retry,
  onClose,
}: {
  invoice: RejectableInvoice;
  values: RejectionValues;
  template: MailTemplate;
  customTemplate: boolean;
  recipient: { address: string; source: 'eInvoice' | 'contact' | null };
  retry: RejectionRetry | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const mail = useMailSettings();
  const mailMode = mail.data?.mail_mode;
  const send = useSendRejectionMail(invoice.id);

  const fromTemplate = (source: MailTemplate) => {
    const filled = fillTemplate(source, values);
    return { subject: filled.subject, text: filled.body };
  };
  const [draft, setDraft] = useState<Draft>(() => {
    const filled = fromTemplate(template);
    return retry
      ? { to: retry.to.join(', '), subject: retry.subject, text: filled.text }
      : { to: recipient.address, ...filled };
  });
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [touched, setTouched] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);

  const recipients = parseRecipients(draft.to);
  const recipientError =
    recipients.invalid.length > 0
      ? t('domain:send.errors.invalidRecipient', { address: recipients.invalid.join(', ') })
      : recipients.valid.length === 0
        ? t('domain:send.errors.noRecipient')
        : undefined;
  const editInvalid = Boolean(recipientError) || !draft.subject.trim() || !draft.text.trim();
  const body: RejectionBody = {
    to: recipients.valid,
    subject: draft.subject.trim(),
    text: draft.text.trim(),
  };
  const preview = useRejectionPreview(invoice.id, body, step === 'preview');
  const missingFields = preview.data?.missingLegalFields ?? [];
  const previewErrorCode =
    preview.error instanceof RejectionSendError ? preview.error.code : 'unknown';
  const sendErrorCode = send.error instanceof RejectionSendError ? send.error.code : null;

  function close() {
    if (send.isPending) return;
    onClose();
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
          description: t('domain:rejectionMail.bookkeepingFailed'),
        });
      else toast.success(t('domain:send.result.sent', { to }));
      onClose();
    } catch {
      // Die Meldung steht im Dialog (send.error), der Dialog bleibt offen.
    }
  }

  const recipientHint = retry
    ? t('domain:rejectionMail.recipientFrom.retry')
    : recipient.source === 'eInvoice'
      ? t('domain:rejectionMail.recipientFrom.eInvoice')
      : recipient.source === 'contact'
        ? t('domain:rejectionMail.recipientFrom.contact')
        : t('domain:rejectionMail.recipientFrom.none');

  return (
    <>
      <DialogBody>
        <DialogTitle>
          {step === 'edit' ? t('domain:rejectionMail.title') : t('domain:send.previewTitle')}
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
                {t('domain:rejectionMail.testMode')}
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
                hint={`${recipientHint} ${t('domain:send.toHint')}`}
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
                  rows={10}
                  resize="vertical"
                  value={draft.text}
                  onChange={(_, d) => setDraft({ ...draft, text: d.value })}
                />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Text size={200} className="text-muted-foreground">
                  {customTemplate
                    ? t('domain:rejectionMail.templateCustom')
                    : t('domain:rejectionMail.templateBuiltin')}
                </Text>
                <Button
                  appearance="subtle"
                  icon={<EditRegular />}
                  onClick={() => setEditingTemplate(true)}
                >
                  {t('domain:rejectionMail.editTemplate')}
                </Button>
              </div>
            </>
          ) : preview.isLoading ? (
            <div className="flex items-center gap-2 py-6">
              <Spinner size="tiny" />
              <Text size={200} className="text-muted-foreground">
                {t('domain:send.previewLoading')}
              </Text>
            </div>
          ) : preview.data ? (
            <MailPreviewFrame preview={preview.data} to={body.to} subject={body.subject} />
          ) : (
            <MessageBar intent="error" layout="multiline">
              <MessageBarBody>
                <MessageBarTitle>{t('domain:send.previewError')}</MessageBarTitle>
                {errorText(t, previewErrorCode)}
              </MessageBarBody>
              <MessageBarActions>
                <Button onClick={() => void preview.refetch()}>{t('common:action.retry')}</Button>
              </MessageBarActions>
            </MessageBar>
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
              label={t('domain:rejectionMail.confirm')}
            />
          ) : null}

          {sendErrorCode ? (
            <MessageBar intent="error" role="alert" layout="multiline">
              <MessageBarBody>
                <MessageBarTitle>{t('domain:send.errors.title')}</MessageBarTitle>
                {errorText(t, sendErrorCode)}
              </MessageBarBody>
              {RETRYABLE.has(sendErrorCode) ? (
                <MessageBarActions>
                  <Button disabled={send.isPending} onClick={() => void onSend()}>
                    {t('common:action.retry')}
                  </Button>
                </MessageBarActions>
              ) : null}
            </MessageBar>
          ) : null}
        </DialogContent>
        <DialogActions>
          {step === 'edit' ? (
            <>
              <Button onClick={close}>{t('domain:rejectionMail.skip')}</Button>
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
                disabled={!confirmed || !preview.data || missingFields.length > 0 || send.isPending}
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

      {editingTemplate ? (
        <RejectionTemplateDialog
          template={template}
          customTemplate={customTemplate}
          onClose={() => setEditingTemplate(false)}
          onSaved={(saved) => {
            // Betreff und Text frisch aus der neuen Vorlage; der Empfänger bleibt.
            setDraft((current) => ({ ...current, ...fromTemplate(saved) }));
            setEditingTemplate(false);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Vorlage des Betriebs bearbeiten (#165). Speichern gilt für alle künftigen
 * Ablehnungs-Mails; „Zurücksetzen“ löscht die eigene Zeile, danach gilt
 * wieder die eingebaute Vorlage.
 */
function RejectionTemplateDialog({
  template,
  customTemplate,
  onClose,
  onSaved,
}: {
  template: MailTemplate;
  customTemplate: boolean;
  onClose: () => void;
  onSaved: (template: MailTemplate) => void;
}) {
  const { t } = useTranslation();
  const builtin = useBuiltinTemplate();
  const save = useSaveRejectionTemplate();
  const [draft, setDraft] = useState<MailTemplate>(template);
  const [touched, setTouched] = useState(false);
  const [lastAction, setLastAction] = useState<'save' | 'reset'>('save');
  const errors = templateErrors(draft);
  const unknown = unknownPlaceholders(draft);

  async function submit(action: 'save' | 'reset') {
    setLastAction(action);
    setTouched(true);
    if (action === 'save' && (errors.subject || errors.body)) return;
    // Gleich der eingebauten heißt: keine eigene Zeile.
    const next = action === 'reset' || isSameTemplate(draft, builtin) ? null : draft;
    try {
      await save.mutateAsync(next);
      toast.success(
        next === null
          ? t('domain:rejectionMail.templateDialog.resetDone')
          : t('domain:rejectionMail.templateDialog.saved'),
      );
      onSaved(next ?? builtin);
    } catch {
      // Die Meldung steht im Dialog (save.error).
    }
  }

  const fieldError = (error: string | null) =>
    touched && error
      ? t(`domain:rejectionMail.templateDialog.errors.${error}`, {
          max: error === 'subjectTooLong' ? MAX_TEMPLATE_SUBJECT : MAX_TEMPLATE_BODY,
        })
      : undefined;

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open && !save.isPending) onClose();
      }}
    >
      <DialogSurface className="max-w-2xl">
        <DialogBody>
          <DialogTitle>{t('domain:rejectionMail.templateDialog.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-4">
            <Text size={200}>{t('domain:rejectionMail.templateDialog.text')}</Text>
            <Field
              label={t('domain:send.subject')}
              required
              validationMessage={fieldError(errors.subject)}
            >
              <Input
                value={draft.subject}
                onChange={(_, d) => setDraft({ ...draft, subject: d.value })}
              />
            </Field>
            <Field
              label={t('domain:send.text')}
              required
              validationMessage={fieldError(errors.body)}
            >
              <Textarea
                rows={10}
                resize="vertical"
                value={draft.body}
                onChange={(_, d) => setDraft({ ...draft, body: d.value })}
              />
            </Field>
            <div className="flex flex-col gap-1">
              <Text size={200} weight="semibold">
                {t('domain:rejectionMail.templateDialog.placeholders')}
              </Text>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-sm">
                {REJECTION_PLACEHOLDERS.map((name) => (
                  <div key={name} className="contents">
                    <dt className="font-mono">{`{${name}}`}</dt>
                    <dd className="text-muted-foreground">
                      {t(`domain:rejectionMail.placeholders.${name}`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            {unknown.length > 0 ? (
              <MessageBar intent="warning" layout="multiline">
                <MessageBarBody>
                  {t('domain:rejectionMail.templateDialog.unknown', {
                    names: unknown.join(', '),
                  })}
                </MessageBarBody>
              </MessageBar>
            ) : null}
            {save.isError ? (
              <MessageBar intent="error" layout="multiline">
                <MessageBarBody>
                  {readableDbError(save.error) ??
                    t('domain:rejectionMail.templateDialog.saveError')}
                </MessageBarBody>
                <MessageBarActions>
                  <Button disabled={save.isPending} onClick={() => void submit(lastAction)}>
                    {t('common:action.retry')}
                  </Button>
                </MessageBarActions>
              </MessageBar>
            ) : null}
          </DialogContent>
          {customTemplate ? (
            <DialogActions position="start">
              <Button disabled={save.isPending} onClick={() => void submit('reset')}>
                {t('domain:rejectionMail.templateDialog.reset')}
              </Button>
            </DialogActions>
          ) : null}
          <DialogActions>
            <Button disabled={save.isPending} onClick={onClose}>
              {t('common:action.cancel')}
            </Button>
            <Button
              appearance="primary"
              disabled={save.isPending}
              icon={save.isPending ? <Spinner size="tiny" /> : undefined}
              onClick={() => void submit('save')}
            >
              {t('domain:rejectionMail.templateDialog.save')}
            </Button>
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
export function MailPreviewFrame({
  preview,
  to,
  subject,
}: {
  preview: Pick<RejectionPreview, 'html'> & Partial<Pick<RejectionPreview, 'from' | 'replyTo'>>;
  to: string[];
  subject: string;
}) {
  const { t } = useTranslation();
  const rows: [string, string][] = [
    ...(preview.from !== undefined
      ? ([
          [t('domain:send.preview.from'), preview.from],
          [t('domain:send.preview.replyTo'), preview.replyTo ?? '–'],
        ] as [string, string][])
      : []),
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
    </div>
  );
}
