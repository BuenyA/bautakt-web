import { SkeletonBlock, StatusBadge, type StatusTone, toast } from '@bautakt/ui';
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Radio,
  RadioGroup,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DetailRow } from '@/components/common/DetailCard';
import { useReportUnsaved } from '@/components/common/unsavedChanges';
import { useCompanyLegalDetails } from '@/features/company/useLegalFooter';
import {
  effectiveReplyTo,
  mailModeQueryKey,
  type MailModeState,
  type MailSettings,
  mailSettingsLogQueryKey,
  toMailModeState,
  useMailModeState,
  useMailSettings,
  useMailSettingsLog,
} from '@/features/company/useMailSettings';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';

import { AddressList } from './AddressList';
import { isValidEmail } from './companyValidation';
import { InboundMailCard } from './InboundMailCard';
import {
  addAddress,
  type AddAddressResult,
  capLowersMode,
  type MailMode,
  mailSettingsErrorKey,
  removeAddress,
  sameSettings,
  selectableModes,
  toMailMode,
} from './mailSettingsModel';

const MODE_TONES: Record<MailMode, StatusTone> = {
  dry_run: 'neutral',
  allowlist: 'warning',
  live: 'success',
};

/** Fehlertext einer Mail-RPC: bekannter Code, sonst die Datenbankmeldung. */
function useMailErrorText() {
  const { t } = useTranslation();
  return (error: unknown) => {
    const message = error instanceof Error ? error.message : readableDbError(error);
    const key = mailSettingsErrorKey(message);
    if (key) return t(`domain:mailSettings.errors.${key}`);
    return readableDbError(error) ?? message ?? t('domain:settings.saveError');
  };
}

/**
 * Bereich „E-Mail“ (#220, #274): wie Bautakt Belege für den Betrieb
 * verschickt.
 *
 * - Versandmodus und Testadressen ändert nur der Owner (Chef), über
 *   `set_company_mail_settings`. `live` schaltet nur die Plattform frei.
 * - Die Obergrenze der Plattform hat immer Vorrang; die Seite zeigt sie und
 *   die wirksame Stufe aus `get_company_mail_settings`.
 * - Das Änderungsprotokoll sieht nur der Owner, nur lesend.
 * - Wohin Antworten gehen, ändert, wer die Firmeneinstellungen pflegt.
 *
 * ⚠️ Führung, keine Kontrolle: Die Rechte prüft die Datenbank.
 */
export function MailSettingsCard() {
  const { t } = useTranslation();
  const canEdit = usePermission('canManageCompanySettings');
  const canBilling = usePermission('canUseBillingModule');
  const { data: membership } = useMembership();
  const isOwner = membership?.systemKey === 'owner';
  const settings = useMailSettings();
  const modeState = useMailModeState();
  const legal = useCompanyLegalDetails();

  if (!canEdit && !canBilling && !isOwner) return null;

  const companyName = membership?.companyName ?? '';
  const companyEmail = legal.data?.email ?? '';
  const loadError = settings.isError ? settings.error : modeState.isError ? modeState.error : null;

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title={t('domain:mailSettings.title')}
        description={
          <Text className="text-muted-foreground">{t('domain:mailSettings.description')}</Text>
        }
      >
        {settings.isLoading || modeState.isLoading || legal.isLoading ? (
          <SkeletonBlock className="h-40 w-full" />
        ) : loadError ? (
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>
              {t('domain:mailSettings.loadError')}
              {readableDbError(loadError) ? ` ${readableDbError(loadError)}` : ''}
            </MessageBarBody>
            <MessageBarActions>
              <Button
                onClick={() => {
                  void settings.refetch();
                  void modeState.refetch();
                }}
              >
                {t('common:action.retry')}
              </Button>
            </MessageBarActions>
          </MessageBar>
        ) : !settings.data || !modeState.data ? (
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody>{t('domain:mailSettings.notSetUp')}</MessageBarBody>
          </MessageBar>
        ) : (
          <div className="flex flex-col gap-4">
            {isOwner ? (
              <ModeForm
                key={JSON.stringify([modeState.data.mailMode, modeState.data.allowlist])}
                state={modeState.data}
              />
            ) : (
              <ModeNotice state={modeState.data} />
            )}
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
      {!settings.isLoading && !settings.isError ? (
        <InboundMailCard
          slug={settings.data?.inbound_slug}
          senders={settings.data?.inbound_sender_allowlist ?? []}
          isOwner={isOwner}
        />
      ) : null}
      {isOwner && settings.data ? <MailSettingsLogCard /> : null}
    </div>
  );
}

/**
 * Wirksame Stufe, Obergrenze und, falls die Obergrenze absenkt, der Hinweis
 * auf ihren Vorrang. Für alle gleich, ob Owner oder nicht.
 */
function EffectiveMode({ state }: { state: MailModeState }) {
  const { t } = useTranslation();
  const effective = toMailMode(state.effectiveMode);
  const cap = state.modeCap ? toMailMode(state.modeCap) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Text weight="semibold">{t('domain:mailSettings.effectiveMode')}</Text>
        <StatusBadge tone={MODE_TONES[effective]}>
          {t(`domain:mailSettings.modes.${effective}`)}
        </StatusBadge>
      </div>
      <Text className="text-muted-foreground">
        {t(`domain:mailSettings.modeHints.${effective}`)}
      </Text>
      <dl className="flex flex-col gap-3">
        <DetailRow
          label={t('domain:mailSettings.cap')}
          value={cap ? t(`domain:mailSettings.modes.${cap}`) : t('domain:mailSettings.capMissing')}
        />
      </dl>
      {capLowersMode(state.mailMode, state.modeCap) ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            {t('domain:mailSettings.capWins', {
              chosen: t(`domain:mailSettings.modes.${toMailMode(state.mailMode)}`),
              effective: t(`domain:mailSettings.modes.${effective}`),
            })}
          </MessageBarBody>
        </MessageBar>
      ) : null}
    </div>
  );
}

/** Nur lesend: alle mit Zugriff außer dem Owner. */
function ModeNotice({ state }: { state: MailModeState }) {
  const { t } = useTranslation();
  const stored = toMailMode(state.mailMode);

  return (
    <div className="flex flex-col gap-4">
      <EffectiveMode state={state} />
      <dl className="flex flex-col gap-3">
        <DetailRow
          label={t('domain:mailSettings.mode')}
          value={t(`domain:mailSettings.modes.${stored}`)}
        />
      </dl>
      <div className="flex flex-col gap-1">
        <Text weight="semibold">{t('domain:mailSettings.allowlist')}</Text>
        <AddressList
          addresses={state.allowlist}
          emptyText={t('domain:mailSettings.allowlistEmpty')}
        />
      </div>
    </div>
  );
}

const ADD_ERRORS: Record<Exclude<AddAddressResult, { ok: true }>['reason'], string> = {
  empty: 'domain:mailSettings.addErrors.empty',
  invalid: 'domain:mailSettings.addErrors.invalid',
  duplicate: 'domain:mailSettings.addErrors.duplicate',
  tooMany: 'domain:mailSettings.addErrors.tooMany',
};

/** Owner: Modus wählen und Testadressen pflegen. */
function ModeForm({ state }: { state: MailModeState }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const errorText = useMailErrorText();

  const [mode, setMode] = useState<MailMode>(toMailMode(state.mailMode));
  const [allowlist, setAllowlist] = useState<string[]>(state.allowlist);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState('');

  const dirty = !sameSettings(
    { mode, allowlist },
    { mode: state.mailMode, allowlist: state.allowlist },
  );
  const pendingDraft = draft.trim() !== '';
  useReportUnsaved(dirty || pendingDraft);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('set_company_mail_settings', {
        p_company_id: companyId!,
        p_mail_mode: mode,
        p_allowlist: allowlist,
      });
      if (error) throw error;
      const row = data?.[0];
      // Ohne Rückgabe ist nichts gespeichert; nie als Erfolg melden.
      if (!row) throw new Error('mail_settings_not_saved');
      return toMailModeState(row);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(mailModeQueryKey(companyId), saved);
      void queryClient.invalidateQueries({ queryKey: ['company-mail-settings', companyId] });
      void queryClient.invalidateQueries({ queryKey: mailSettingsLogQueryKey(companyId) });
      toast.success(t('domain:settings.saved'));
    },
  });

  const add = () => {
    const result = addAddress(allowlist, draft);
    if (!result.ok) {
      setAddError(t(ADD_ERRORS[result.reason]));
      return;
    }
    setAllowlist(result.list);
    setDraft('');
    setAddError('');
  };

  const busy = save.isPending;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.reset();
        save.mutate();
      }}
    >
      <EffectiveMode state={state} />

      <Field label={t('domain:mailSettings.mode')} hint={t('domain:mailSettings.modeOwnerHint')}>
        <RadioGroup
          value={mode}
          disabled={busy}
          onChange={(_, data) => setMode(toMailMode(data.value))}
        >
          {selectableModes(state.mailMode).map((option) => (
            <Radio
              key={option}
              value={option}
              label={t(`domain:mailSettings.modeOptions.${option}`)}
            />
          ))}
        </RadioGroup>
      </Field>

      <div className="flex flex-col gap-2">
        <Text weight="semibold">{t('domain:mailSettings.allowlist')}</Text>
        <Text className="text-muted-foreground">{t('domain:mailSettings.allowlistHint')}</Text>
        <AddressList
          addresses={allowlist}
          emptyText={t('domain:mailSettings.allowlistEmpty')}
          disabled={busy}
          onRemove={(address) => setAllowlist(removeAddress(allowlist, address))}
        />
        <Field
          label={t('domain:mailSettings.addAddress')}
          validationMessage={addError || undefined}
        >
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-0 flex-1"
              type="email"
              value={draft}
              disabled={busy}
              placeholder={t('domain:mailSettings.addAddressPlaceholder')}
              onChange={(_, data) => {
                setDraft(data.value);
                if (addError) setAddError('');
              }}
              onKeyDown={(event) => {
                // Enter fügt hinzu statt das ganze Formular zu speichern.
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
              }}
            />
            <Button disabled={busy} onClick={add}>
              {t('domain:mailSettings.addAddressButton')}
            </Button>
          </div>
        </Field>
      </div>

      {save.isError ? (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {t('domain:settings.saveError')} {errorText(save.error)}
          </MessageBarBody>
          <MessageBarActions>
            <Button
              onClick={() => {
                save.reset();
                save.mutate();
              }}
            >
              {t('common:action.retry')}
            </Button>
          </MessageBarActions>
        </MessageBar>
      ) : null}

      {pendingDraft ? (
        <Text className="text-muted-foreground">{t('domain:mailSettings.draftNotAdded')}</Text>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          disabled={!dirty || busy}
          onClick={() => {
            setMode(toMailMode(state.mailMode));
            setAllowlist(state.allowlist);
            setDraft('');
            setAddError('');
            save.reset();
          }}
        >
          {t('common:action.discard')}
        </Button>
        <Button
          appearance="primary"
          type="submit"
          disabled={!dirty || busy}
          icon={busy ? <Spinner size="tiny" /> : undefined}
        >
          {t('common:action.save')}
        </Button>
      </div>
    </form>
  );
}

/** Nur lesend, nur für den Owner (RLS auf `company_mail_settings_log`). */
function MailSettingsLogCard() {
  const { t } = useTranslation();
  const log = useMailSettingsLog(true);

  const modeName = (value: string) => t(`domain:mailSettings.modes.${toMailMode(value)}`);
  const addressText = (list: readonly string[]) =>
    list.length > 0 ? list.join(', ') : t('domain:mailSettings.logNoAddresses');

  return (
    <SectionCard
      title={t('domain:mailSettings.logTitle')}
      description={
        <Text className="text-muted-foreground">{t('domain:mailSettings.logDescription')}</Text>
      }
    >
      {log.isLoading ? (
        <SkeletonBlock className="h-24 w-full" />
      ) : log.isError ? (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {t('domain:mailSettings.logLoadError')}
            {readableDbError(log.error) ? ` ${readableDbError(log.error)}` : ''}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => void log.refetch()}>{t('common:action.retry')}</Button>
          </MessageBarActions>
        </MessageBar>
      ) : !log.data || log.data.length === 0 ? (
        <Text className="text-muted-foreground">{t('domain:mailSettings.logEmpty')}</Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {log.data.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0"
            >
              <Text size={200} className="text-muted-foreground">
                {t('domain:mailSettings.logWhen', {
                  when: formatDateTime(entry.changedAt),
                  who: entry.changedByName || t('domain:mailSettings.logUnknownPerson'),
                })}
              </Text>
              {entry.oldMode !== entry.newMode ? (
                <Text>
                  {t('domain:mailSettings.logMode', {
                    from: modeName(entry.oldMode),
                    to: modeName(entry.newMode),
                  })}
                </Text>
              ) : null}
              {!sameSettings(
                { mode: '', allowlist: entry.oldAllowlist },
                { mode: '', allowlist: entry.newAllowlist },
              ) ? (
                <Text>
                  {t('domain:mailSettings.logAllowlist', {
                    from: addressText(entry.oldAllowlist),
                    to: addressText(entry.newAllowlist),
                  })}
                </Text>
              ) : null}
              {!sameSettings(
                { mode: '', allowlist: entry.oldInboundSenders },
                { mode: '', allowlist: entry.newInboundSenders },
              ) ? (
                <Text>
                  {t('domain:mailSettings.logInboundSenders', {
                    from: addressText(entry.oldInboundSenders),
                    to: addressText(entry.newInboundSenders),
                  })}
                </Text>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
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
