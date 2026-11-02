import { SkeletonBlock, toast } from '@bautakt/ui';
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
import { useReportUnsaved } from '@/components/common/unsavedChanges';
import { mailSettingsLogQueryKey, useInboundRejections } from '@/features/company/useMailSettings';
import { useMembership } from '@/features/company/useMembership';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';

import { AddressList } from './AddressList';
import {
  addSender,
  type AddSenderResult,
  inboundAddress,
  mailSettingsErrorKey,
  rejectionReasonKey,
  removeAddress,
  sortAddresses,
} from './mailSettingsModel';

const ADD_ERRORS: Record<Exclude<AddSenderResult, { ok: true }>['reason'], string> = {
  empty: 'domain:mailSettings.inbound.addErrors.empty',
  invalid: 'domain:mailSettings.inbound.addErrors.invalid',
  duplicate: 'domain:mailSettings.inbound.addErrors.duplicate',
  tooMany: 'domain:mailSettings.inbound.addErrors.tooMany',
};

/**
 * Mail-Eingang (bautakt-web#221, #280): Empfangsadresse, Absender-Freigabeliste
 * und abgewiesene Mails. Die Oberfläche vergibt keinen Slug; ohne Slug nimmt der
 * Mail-Eingang für den Betrieb nichts an. Abgewiesene Mails bleiben auch dann
 * sichtbar, wenn der Slug später wegfällt.
 */
export function InboundMailCard({
  slug,
  senders,
  isOwner,
}: {
  slug: string | null | undefined;
  senders: readonly string[];
  isOwner: boolean;
}) {
  const { t } = useTranslation();
  const address = inboundAddress(slug);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('domain:mailSettings.inbound.copied'));
    } catch {
      toast.error(t('domain:mailSettings.inbound.copyError'));
    }
  };

  return (
    <SectionCard
      title={t('domain:mailSettings.inbound.title')}
      description={
        <Text className="text-muted-foreground">
          {t('domain:mailSettings.inbound.description')}
        </Text>
      }
    >
      <div className="flex flex-col gap-6">
        {address ? (
          <div className="flex flex-col gap-4">
            <dl className="m-0 flex flex-col gap-3">
              <DetailRow label={t('domain:mailSettings.inbound.address')} value={address} />
            </dl>
            <div>
              <Button onClick={() => void copy(address)}>
                {t('domain:mailSettings.inbound.copy')}
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              <Text weight="semibold">{t('domain:mailSettings.inbound.howTitle')}</Text>
              <ol className="m-0 flex list-decimal flex-col gap-1 pl-5">
                <li>
                  <Text>{t('domain:mailSettings.inbound.howForward')}</Text>
                </li>
                <li>
                  <Text>{t('domain:mailSettings.inbound.howSuppliers')}</Text>
                </li>
                <li>
                  <Text>{t('domain:mailSettings.inbound.howCheck')}</Text>
                </li>
              </ol>
            </div>
            {isOwner ? (
              <SenderForm key={JSON.stringify(senders)} stored={senders} />
            ) : senders.length > 0 ? (
              <div className="flex flex-col gap-2">
                <Text weight="semibold">{t('domain:mailSettings.inbound.senders')}</Text>
                <AddressList addresses={senders} emptyText="" />
              </div>
            ) : null}
          </div>
        ) : (
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody>{t('domain:mailSettings.inbound.notSetUp')}</MessageBarBody>
          </MessageBar>
        )}
        <Rejections />
      </div>
    </SectionCard>
  );
}

/** Nur der Owner, über `set_inbound_sender_allowlist`. */
function SenderForm({ stored }: { stored: readonly string[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  const [list, setList] = useState<string[]>([...stored]);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState('');

  const dirty = JSON.stringify(sortAddresses(list)) !== JSON.stringify(sortAddresses(stored));
  const pendingDraft = draft.trim() !== '';
  useReportUnsaved(dirty || pendingDraft);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('set_inbound_sender_allowlist', {
        p_company_id: companyId!,
        p_allowlist: list,
      });
      if (error) throw error;
      // Ohne Rückgabe ist nichts gespeichert; nie als Erfolg melden.
      if (!data) throw new Error('mail_settings_not_saved');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-mail-settings', companyId] });
      void queryClient.invalidateQueries({ queryKey: mailSettingsLogQueryKey(companyId) });
      toast.success(t('domain:settings.saved'));
    },
  });

  const add = () => {
    const result = addSender(list, draft);
    if (!result.ok) {
      setAddError(t(ADD_ERRORS[result.reason]));
      return;
    }
    setList(result.list);
    setDraft('');
    setAddError('');
  };

  const busy = save.isPending;
  const saveErrorMessage = save.error instanceof Error ? save.error.message : '';
  const errorKey = mailSettingsErrorKey(saveErrorMessage || readableDbError(save.error));

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        save.reset();
        save.mutate();
      }}
    >
      <Text weight="semibold">{t('domain:mailSettings.inbound.senders')}</Text>
      <Text className="text-muted-foreground">{t('domain:mailSettings.inbound.sendersHint')}</Text>
      <AddressList
        addresses={list}
        emptyText={t('domain:mailSettings.inbound.sendersEmpty')}
        disabled={busy}
        onRemove={(address) => setList(removeAddress(list, address))}
      />
      <Field
        label={t('domain:mailSettings.inbound.addSender')}
        validationMessage={addError || undefined}
      >
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-0 flex-1"
            value={draft}
            disabled={busy}
            placeholder={t('domain:mailSettings.inbound.addSenderPlaceholder')}
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

      {save.isError ? (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {t('domain:settings.saveError')}{' '}
            {errorKey
              ? t(`domain:mailSettings.errors.${errorKey}`)
              : (readableDbError(save.error) ?? saveErrorMessage)}
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
        <Text className="text-muted-foreground">
          {t('domain:mailSettings.inbound.draftNotAdded')}
        </Text>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          disabled={!dirty || busy}
          onClick={() => {
            setList([...stored]);
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

/** Lesen darf, wer Finanzen sieht (RLS); ohne Recht oder ohne Einträge bleibt es leer. */
function Rejections() {
  const { t } = useTranslation();
  const rejections = useInboundRejections();

  if (rejections.isPending) return <SkeletonBlock className="h-16 w-full" />;
  if (rejections.isError) {
    return (
      <MessageBar intent="error" layout="multiline">
        <MessageBarBody>
          {t('domain:mailSettings.inbound.rejectionsLoadError')}
          {readableDbError(rejections.error) ? ` ${readableDbError(rejections.error)}` : ''}
        </MessageBarBody>
        <MessageBarActions>
          <Button onClick={() => void rejections.refetch()}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      </MessageBar>
    );
  }
  if (rejections.data.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Text weight="semibold">{t('domain:mailSettings.inbound.rejections')}</Text>
      <Text className="text-muted-foreground">
        {t('domain:mailSettings.inbound.rejectionsHint')}
      </Text>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rejections.data.map((rejection) => (
          <li
            key={rejection.id}
            className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0"
          >
            <Text size={200} className="text-muted-foreground">
              {formatDateTime(rejection.received_at)} ·{' '}
              {t(`domain:mailSettings.inbound.reasons.${rejectionReasonKey(rejection.reason)}`)}
            </Text>
            <Text className="break-words">
              {rejection.from_email ?? t('domain:mailSettings.inbound.noSender')}
            </Text>
            <Text size={200} className="break-words">
              {rejection.subject ?? t('domain:mailSettings.inbound.noSubject')}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
