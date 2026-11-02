import { toast } from '@bautakt/ui';
import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import {
  type InboundFile,
  type InboundFileDecision,
  inboundFileErrorKey,
  resolvedInboundFile,
  splitInboundFiles,
} from './inboundReview';
import { downloadIncomingOriginal } from './useIncomingInvoice';

/** Die Oberfläche zeigt je Stand die neuesten; ältere bleiben in der Datenbank. */
const FILES_LIMIT = 200;
const REVOKE_AFTER_MS = 60_000;

function useInboundFiles() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['inbound-mail-files', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbound_mail_files')
        .select(
          'id, file_name, status, storage_path, created_at, inbound_mails(from_email, subject, received_at)',
        )
        .eq('company_id', companyId!)
        .in('status', ['to_review', 'not_invoice'])
        .order('created_at', { ascending: false })
        .limit(FILES_LIMIT);
      if (error) throw error;
      return splitInboundFiles(data);
    },
  });
}

/**
 * „Zu prüfen“ über den Eingangsrechnungen (bautakt-web#281): Mail-Anhänge ohne
 * E-Rechnung. Sie sind keine Belege und zählen in keiner Summe. Ohne Einträge
 * zeigt der Abschnitt nichts. Die Rechte prüft die Datenbank.
 */
export function InboundReviewSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const canManage = usePermission('canManageOverheadCosts');
  const files = useInboundFiles();
  const [showNotInvoice, setShowNotInvoice] = useState(false);

  const resolve = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: InboundFileDecision }) => {
      const { data, error } = await supabase.rpc('resolve_inbound_mail_file', {
        p_file_id: id,
        p_decision: decision,
      });
      if (error) throw error;
      const resolved = resolvedInboundFile(data);
      // Ohne gültige Antwort ist nichts gespeichert; nie als Erfolg melden.
      if (!resolved) throw new Error('inbound_file_not_saved');
      return resolved;
    },
    onSuccess: async (resolved) => {
      await queryClient.invalidateQueries({ queryKey: ['inbound-mail-files', companyId] });
      if (resolved.invoiceId) {
        await queryClient.invalidateQueries({ queryKey: ['incoming-invoices-list', companyId] });
        void navigate(routes.incomingInvoice(resolved.invoiceId));
      } else {
        toast.success(t('domain:inboundReview.markedNotInvoice'));
      }
    },
  });

  const open = useMutation({
    mutationFn: async (file: InboundFile) => {
      // Vor dem Laden öffnen: Nach dem Warten blockiert der Browser das Fenster.
      const target = window.open('', '_blank');
      if (!target) throw new Error('popup_blocked');
      try {
        const bytes = await downloadIncomingOriginal(file.storagePath);
        const url = URL.createObjectURL(new Blob([bytes.slice()], { type: 'application/pdf' }));
        target.location.href = url;
        window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
      } catch (error) {
        target.close();
        throw error;
      }
    },
  });

  if (files.isPending) return null;
  if (files.isError) {
    return (
      <MessageBar intent="error" layout="multiline">
        <MessageBarBody>
          {t('domain:inboundReview.loadError')}
          {readableDbError(files.error) ? ` ${readableDbError(files.error)}` : ''}
        </MessageBarBody>
        <MessageBarActions>
          <Button onClick={() => void files.refetch()}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      </MessageBar>
    );
  }

  const { toReview, notInvoice } = files.data;
  if (toReview.length === 0 && notInvoice.length === 0) return null;

  const busy = resolve.isPending;
  const resolveErrorMessage = resolve.error instanceof Error ? resolve.error.message : '';
  const errorKey = inboundFileErrorKey(resolveErrorMessage || readableDbError(resolve.error));

  const row = (file: InboundFile) => {
    const decided = notInvoice.includes(file);
    const pendingHere = busy && resolve.variables?.id === file.id;
    return (
      <li
        key={file.id}
        className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0"
      >
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
          <Text weight="semibold" className="break-words">
            {file.fileName}
          </Text>
          <Text size={200} className="break-words text-muted-foreground">
            {formatDateTime(file.receivedAt)} ·{' '}
            {file.fromEmail ?? t('domain:mailSettings.inbound.noSender')}
          </Text>
          <Text size={200} className="break-words">
            {file.subject ?? t('domain:mailSettings.inbound.noSubject')}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={open.isPending} onClick={() => open.mutate(file)}>
            {t('domain:inboundReview.open')}
          </Button>
          {canManage && !decided ? (
            <Button
              disabled={busy}
              onClick={() => resolve.mutate({ id: file.id, decision: 'not_invoice' })}
            >
              {t('domain:inboundReview.notInvoice')}
            </Button>
          ) : null}
          {canManage ? (
            <Button
              appearance={decided ? 'secondary' : 'primary'}
              disabled={busy}
              icon={pendingHere ? <Spinner size="tiny" /> : undefined}
              onClick={() => resolve.mutate({ id: file.id, decision: 'invoice' })}
            >
              {t(decided ? 'domain:inboundReview.invoiceAfterAll' : 'domain:inboundReview.invoice')}
            </Button>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <SectionCard
      title={t('domain:inboundReview.title', { count: toReview.length })}
      description={
        <Text className="text-muted-foreground">{t('domain:inboundReview.description')}</Text>
      }
    >
      <div className="flex flex-col gap-3">
        {resolve.isError ? (
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>
              {t('domain:inboundReview.resolveError')}{' '}
              {errorKey
                ? t(`domain:inboundReview.errors.${errorKey}`)
                : (readableDbError(resolve.error) ?? resolveErrorMessage)}
            </MessageBarBody>
            <MessageBarActions>
              <Button
                onClick={() => {
                  if (resolve.variables) resolve.mutate(resolve.variables);
                }}
              >
                {t('common:action.retry')}
              </Button>
            </MessageBarActions>
          </MessageBar>
        ) : null}
        {open.isError ? (
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>{t('domain:inboundReview.openError')}</MessageBarBody>
            <MessageBarActions>
              <Button
                onClick={() => {
                  if (open.variables) open.mutate(open.variables);
                }}
              >
                {t('common:action.retry')}
              </Button>
            </MessageBarActions>
          </MessageBar>
        ) : null}
        {toReview.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">{toReview.map(row)}</ul>
        ) : (
          <Text className="text-muted-foreground">{t('domain:inboundReview.nothingOpen')}</Text>
        )}
        {notInvoice.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div>
              <Button
                appearance="subtle"
                aria-expanded={showNotInvoice}
                onClick={() => setShowNotInvoice((shown) => !shown)}
              >
                {t(
                  showNotInvoice
                    ? 'domain:inboundReview.hideNotInvoice'
                    : 'domain:inboundReview.showNotInvoice',
                  { count: notInvoice.length },
                )}
              </Button>
            </div>
            {showNotInvoice ? (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">{notInvoice.map(row)}</ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
