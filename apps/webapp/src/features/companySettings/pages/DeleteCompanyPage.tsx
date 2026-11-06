import { DangerButton, SkeletonBlock, toast } from '@bautakt/ui';
import {
  Button,
  Checkbox,
  Field,
  Input,
  Link,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { ArrowUndo20Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';
import { SubPage } from '@/components/layout/SubNavLayout';
import { useCompanyLifecycle } from '@/features/company/useCompanyLifecycle';
import { useMembership } from '@/features/company/useMembership';
import { SectionCard } from '@/features/contacts/SectionCard';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { SUPPORT_EMAIL } from '@/lib/support';

import { useCompanyAccess } from '../companyAccess';
import { SectionGuard } from '../SectionGuard';
import { berlinToday, terminationState } from '../termination';
import { TerminationError, useCompanyTermination } from '../useCompanyTermination';

const STEPS = ['grace', 'export', 'access', 'lock', 'delete'] as const;

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

/**
 * Unternehmen kündigen (Löschkonzept WP6, bautakt-app wiki/pages/loeschkonzept.md).
 *
 * Nur der Inhaber. Antrag mit Export-Hinweis und Passwort; das Vertragsende liegt 7 Tage
 * später, bis zum Vortag kann jeder Inhaber widerrufen. Die Prüfungen macht die Datenbank
 * (`request_company_termination`, `revoke_company_termination`), die Seite führt nur.
 */
export function DeleteCompanyPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const { data: membership } = useMembership();
  const lifecycle = useCompanyLifecycle();
  const name = membership?.companyName ?? '';
  const today = berlinToday();
  const state = terminationState(lifecycle.row, today);

  return (
    <SectionGuard allowed={access.danger.view}>
      <SubPage
        title={t('companySettings:delete.title')}
        description={t('companySettings:delete.description')}
      >
        {lifecycle.isPending ? (
          <SkeletonBlock className="h-48" />
        ) : state.kind === 'pending' ? (
          <PendingCard
            name={name}
            contractEnd={state.contractEnd}
            revocableUntil={state.revocableUntil}
            canRevoke={state.canRevoke}
          />
        ) : state.kind === 'ended' ? (
          <EndedCard name={name} />
        ) : (
          <RequestCard name={name} contractEnd={addDays(today, 7)} />
        )}
        <Text className="text-muted-foreground">
          {t('companySettings:delete.direct')}{' '}
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Text>
      </SubPage>
    </SectionGuard>
  );
}

function Steps() {
  const { t } = useTranslation();
  return (
    <ul className="text-muted-foreground list-disc pl-5 text-sm">
      {STEPS.map((step) => (
        <li key={step}>{t(`companySettings:delete.steps.${step}`)}</li>
      ))}
    </ul>
  );
}

function RequestCard({ name, contractEnd }: { name: string; contractEnd: string }) {
  const { t } = useTranslation();
  const { request } = useCompanyTermination();
  const exportLink = useRouterLink(routes.companyExport);
  const [exportConfirmed, setExportConfirmed] = useState(false);
  const [password, setPassword] = useState('');
  const errorKey = request.error instanceof TerminationError ? request.error.key : null;

  return (
    <>
      <SectionCard title={t('companySettings:delete.cardTitle', { name })}>
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>{t('companySettings:delete.noticeTitle')}</MessageBarTitle>
            {t('companySettings:delete.notice')}
          </MessageBarBody>
        </MessageBar>
        <Steps />
      </SectionCard>

      <SectionCard title={t('companySettings:delete.requestTitle')}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!exportConfirmed || !password) return;
            request.mutate(
              { password, exportConfirmed },
              {
                onSuccess: () => {
                  setPassword('');
                  toast.success(t('companySettings:delete.requested'));
                },
              },
            );
          }}
        >
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>
              <MessageBarTitle>{t('companySettings:delete.exportTitle')}</MessageBarTitle>
              {t('companySettings:delete.exportBody')}{' '}
              <Link href={exportLink.href} onClick={exportLink.onClick}>
                {t('companySettings:delete.exportLink')}
              </Link>
            </MessageBarBody>
          </MessageBar>
          <Checkbox
            checked={exportConfirmed}
            disabled={request.isPending}
            onChange={(_, d) => {
              request.reset();
              setExportConfirmed(Boolean(d.checked));
            }}
            label={t('companySettings:delete.exportConfirm')}
          />
          <Field
            label={t('companySettings:delete.password')}
            hint={t('companySettings:delete.passwordHint')}
            className="max-w-sm"
          >
            <Input
              type="password"
              value={password}
              autoComplete="current-password"
              disabled={request.isPending}
              onChange={(_, d) => {
                request.reset();
                setPassword(d.value);
              }}
            />
          </Field>
          {errorKey ? (
            <MessageBar intent="error" role="alert" layout="multiline">
              <MessageBarBody>{t(errorKey)}</MessageBarBody>
            </MessageBar>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <DangerButton
              type="submit"
              disabled={!exportConfirmed || !password || request.isPending}
              icon={request.isPending ? <Spinner size="tiny" /> : undefined}
            >
              {t('companySettings:delete.request')}
            </DangerButton>
            <Text className="text-muted-foreground">
              {t('companySettings:delete.requestHint', { end: formatDate(contractEnd) })}
            </Text>
          </div>
        </form>
      </SectionCard>
    </>
  );
}

function PendingCard({
  name,
  contractEnd,
  revocableUntil,
  canRevoke,
}: {
  name: string;
  contractEnd: string;
  revocableUntil: string;
  canRevoke: boolean;
}) {
  const { t } = useTranslation();
  const { revoke } = useCompanyTermination();
  const errorKey = revoke.error instanceof TerminationError ? revoke.error.key : null;

  return (
    <SectionCard title={t('companySettings:delete.cardTitle', { name })}>
      <MessageBar intent="warning" layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>{t('companySettings:delete.pendingTitle')}</MessageBarTitle>
          {canRevoke
            ? t('companySettings:delete.pendingBody', {
                end: formatDate(contractEnd),
                until: formatDate(revocableUntil),
              })
            : t('companySettings:delete.pendingLate', { end: formatDate(contractEnd) })}
        </MessageBarBody>
      </MessageBar>
      <Steps />
      {errorKey ? (
        <MessageBar intent="error" role="alert" layout="multiline">
          <MessageBarBody>{t(errorKey)}</MessageBarBody>
        </MessageBar>
      ) : null}
      {canRevoke ? (
        <div>
          <Button
            appearance="primary"
            icon={revoke.isPending ? <Spinner size="tiny" /> : <ArrowUndo20Regular />}
            disabled={revoke.isPending}
            onClick={() =>
              revoke.mutate(undefined, {
                onSuccess: () => toast.success(t('companySettings:delete.revoked')),
              })
            }
          >
            {t('companySettings:delete.revoke')}
          </Button>
        </div>
      ) : null}
    </SectionCard>
  );
}

function EndedCard({ name }: { name: string }) {
  const { t } = useTranslation();
  const exportLink = useRouterLink(routes.companyExport);
  return (
    <SectionCard title={t('companySettings:delete.cardTitle', { name })}>
      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>{t('companySettings:delete.endedTitle')}</MessageBarTitle>
          {t('companySettings:delete.endedBody')}{' '}
          <Link href={exportLink.href} onClick={exportLink.onClick}>
            {t('companySettings:delete.exportLink')}
          </Link>
        </MessageBarBody>
      </MessageBar>
    </SectionCard>
  );
}
