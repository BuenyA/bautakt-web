import { SkeletonBlock, StatusBadge, type StatusTone, toast } from '@bautakt/ui';
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DetailRow } from '@/components/common/DetailCard';
import { useCompanyLegalDetails } from '@/features/company/useLegalFooter';
import {
  effectiveReplyTo,
  type MailMode,
  type MailSettings,
  useMailSettings,
} from '@/features/company/useMailSettings';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import { isValidEmail } from './companyValidation';

const MODE_TONES: Record<MailMode, StatusTone> = {
  dry_run: 'neutral',
  allowlist: 'warning',
  live: 'success',
};

const modeOf = (value: string): MailMode =>
  value === 'allowlist' || value === 'live' ? value : 'dry_run';

/**
 * Bereich „E-Mail“ (#220 Teil A): wie Bautakt Belege für den Betrieb
 * verschickt. Absender, Versandmodus, Testadressen und Limits bestimmt der
 * Mail-Adapter und sind hier nur zu sehen; bearbeiten lässt sich nur, wohin
 * Antworten gehen (`reply_to_email`, Spaltenrecht für Admins).
 *
 * Eine eigene Absenderdomain kommt später.
 */
export function MailSettingsCard() {
  const { t } = useTranslation();
  const canEdit = usePermission('canManageCompanySettings');
  const canBilling = usePermission('canUseBillingModule');
  const { data: membership } = useMembership();
  const settings = useMailSettings();
  const legal = useCompanyLegalDetails();

  if (!canEdit && !canBilling) return null;

  const companyName = membership?.companyName ?? '';
  const companyEmail = legal.data?.email ?? '';

  return (
    <SectionCard
      title={t('domain:mailSettings.title')}
      description={
        <Text size={200} className="text-muted-foreground">
          {t('domain:mailSettings.description')}
        </Text>
      }
    >
      {settings.isLoading || legal.isLoading ? (
        <SkeletonBlock className="h-40 w-full" />
      ) : settings.isError ? (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {t('domain:mailSettings.loadError')}
            {readableDbError(settings.error) ? ` ${readableDbError(settings.error)}` : ''}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => void settings.refetch()}>{t('common:action.retry')}</Button>
          </MessageBarActions>
        </MessageBar>
      ) : !settings.data ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>{t('domain:mailSettings.notSetUp')}</MessageBarBody>
        </MessageBar>
      ) : (
        <div className="flex flex-col gap-4">
          <ModeNotice settings={settings.data} />
          <dl className="flex flex-col gap-3">
            <DetailRow
              label={t('domain:mailSettings.sender')}
              value={`${companyName} <${t('domain:send.preview.senderAddress')}>`}
            />
            <DetailRow
              label={t('domain:mailSettings.limits')}
              value={t('domain:mailSettings.limitsValue', {
                hour: settings.data.send_limit_per_hour,
                day: settings.data.send_limit_per_day,
              })}
            />
          </dl>
          <ReplyToForm
            key={settings.data.reply_to_email ?? ''}
            settings={settings.data}
            companyEmail={companyEmail}
            canEdit={canEdit}
          />
        </div>
      )}
    </SectionCard>
  );
}

function ModeNotice({ settings }: { settings: MailSettings }) {
  const { t } = useTranslation();
  const mode = modeOf(settings.mail_mode);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Text weight="semibold">{t('domain:mailSettings.mode')}</Text>
        <StatusBadge tone={MODE_TONES[mode]}>{t(`domain:mailSettings.modes.${mode}`)}</StatusBadge>
      </div>
      <Text size={200} className="text-muted-foreground">
        {t(`domain:mailSettings.modeHints.${mode}`)}
      </Text>
      {mode === 'allowlist' ? (
        <div className="flex flex-col gap-1">
          <Text size={200} weight="semibold">
            {t('domain:mailSettings.allowlist')}
          </Text>
          {settings.test_recipient_allowlist.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {settings.test_recipient_allowlist.map((address) => (
                <li key={address}>
                  <StatusBadge tone="outline">{address}</StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <Text size={200} className="text-muted-foreground">
              {t('domain:mailSettings.allowlistEmpty')}
            </Text>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ReplyToForm({
  settings,
  companyEmail,
  canEdit,
}: {
  settings: MailSettings;
  companyEmail: string;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  const initial = settings.reply_to_email ?? '';
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);
  const trimmed = value.trim();
  const error = trimmed && !isValidEmail(trimmed) ? t('domain:mailSettings.replyToInvalid') : '';
  const dirty = trimmed !== initial;
  const fallback = effectiveReplyTo(null, companyEmail);

  const save = useMutation({
    mutationFn: async () => {
      // Leer heißt: Antworten an die Firmen-Mail. `null`, nicht '', denn der
      // Adapter fällt nur bei `null` auf die Firmen-Mail zurück.
      const { data, error: dbError } = await supabase
        .from('company_mail_settings')
        .update({ reply_to_email: trimmed || null })
        .eq('company_id', companyId!)
        .select('company_id');
      if (dbError) throw dbError;
      // RLS lässt ein Update ohne Recht still ins Leere laufen.
      if (data?.length !== 1) throw new Error(t('domain:mailSettings.nothingWritten'));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['company-mail-settings', companyId] }),
  });

  const run = async () => {
    try {
      await save.mutateAsync();
      toast.success(t('domain:settings.saved'));
    } catch (caught) {
      toast.error(t('domain:settings.saveError'), {
        description: readableDbError(caught) ?? (caught instanceof Error ? caught.message : ''),
      });
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (!error) void run();
      }}
    >
      <Field
        label={t('domain:mailSettings.replyTo')}
        hint={
          fallback
            ? t('domain:mailSettings.replyToHint', { email: fallback })
            : t('domain:mailSettings.replyToHintNoEmail')
        }
        validationMessage={touched && error ? error : undefined}
      >
        <Input
          type="email"
          value={value}
          placeholder={fallback}
          disabled={!canEdit}
          onChange={(_, d) => setValue(d.value)}
          onBlur={() => setTouched(true)}
        />
      </Field>
      {canEdit ? (
        <div className="flex justify-end">
          <Button
            appearance="primary"
            type="submit"
            disabled={!dirty || save.isPending}
            icon={save.isPending ? <Spinner size="tiny" /> : undefined}
          >
            {t('common:action.save')}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
