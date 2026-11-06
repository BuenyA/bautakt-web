import { Button, Text, Title2 } from '@fluentui/react-components';
import { LockClosed24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/useAuth';
import { formatDate } from '@/lib/format';
import { additionalCompanyParam, routes } from '@/lib/routes';

import type { LifecycleView } from './lifecycle';
import { useSwitchCompany } from './useMyCompanies';

/**
 * Sperrseite nach Vertragsende (Löschkonzept WP3). Mitarbeitende sehen sie ab E, der
 * Inhaber ab E+31. Kein Weg in den Betrieb, nur Wechsel, neuer Betrieb oder Abmelden.
 */
export function CompanyLockedPage({ view }: { view: Extract<LifecycleView, { kind: 'locked' }> }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const switchCompany = useSwitchCompany();

  const body =
    view.isOwner && view.status === 'locked'
      ? t('common:lifecycle.locked.ownerBody', {
          name: view.companyName,
          date: formatDate(view.deleteAfter),
        })
      : t('common:lifecycle.locked.memberBody', { name: view.companyName });

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <LockClosed24Regular />
        <Title2 as="h1">{t('common:lifecycle.locked.title')}</Title2>
        <Text>{body}</Text>

        {view.alternatives.length > 0 && (
          <div className="flex flex-col gap-2">
            <Text weight="semibold">{t('common:lifecycle.locked.otherCompanies')}</Text>
            {view.alternatives.map((c) => (
              <Button
                key={c.companyId}
                appearance="primary"
                disabled={switchCompany.isPending}
                onClick={() => switchCompany.mutate(c.companyId)}
              >
                {t('common:lifecycle.locked.switchTo', { name: c.name })}
              </Button>
            ))}
          </div>
        )}

        <Button
          appearance={view.alternatives.length > 0 ? 'secondary' : 'primary'}
          onClick={() => void navigate(`${routes.companySetup}?${additionalCompanyParam}=1`)}
        >
          {t('common:lifecycle.locked.newCompany')}
        </Button>
        <Button appearance="subtle" onClick={() => void signOut()}>
          {t('common:action.signOut')}
        </Button>
      </div>
    </main>
  );
}
