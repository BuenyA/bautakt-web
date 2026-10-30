import { Button, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';

import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { useAuth } from '@/features/auth/useAuth';
import { additionalCompanyParam, HOME_ROUTE, routes } from '@/lib/routes';

import { useMembership } from './useMembership';

/**
 * Eingeloggte Nutzer ohne Beschaeftigung gehoeren auf die Betriebsanlage.
 * Wer schon einen Betrieb hat, kommt dort nicht hin.
 *
 * ⚠️ Erst umleiten, wenn die Mitgliedschafts-Query fertig ist. Sonst sieht
 * jeder Reload kurz `data === undefined` und landet faelschlich auf
 * `/betrieb-einrichten`. Ein Fehler ist kein „kein Betrieb": sonst wuerde ein
 * Netzfehler eine zweite Firma anlegen lassen.
 */
export function MembershipGate() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const location = useLocation();
  const membership = useMembership();
  const onSetup = location.pathname === routes.companySetup;

  if (membership.isPending) return <FullPageSpinner />;

  if (membership.isError) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MessageBar intent="error" role="alert">
            <MessageBarBody>{t('errors:generic')}</MessageBarBody>
          </MessageBar>
          <Button
            appearance="primary"
            disabled={membership.isFetching}
            onClick={() => void membership.refetch()}
          >
            {t('common:action.retry')}
          </Button>
          <Button appearance="subtle" onClick={() => void signOut()}>
            {t('common:action.signOut')}
          </Button>
        </div>
      </main>
    );
  }

  const hasCompany = membership.data != null;

  if (!hasCompany && !onSetup) {
    return <Navigate to={routes.companySetup} replace />;
  }

  // `?weiteres=1` aus dem Profilmenü: ein zusätzlicher Betrieb ist erlaubt.
  const additional = new URLSearchParams(location.search).get(additionalCompanyParam) === '1';
  if (hasCompany && onSetup && !additional) {
    return <Navigate to={HOME_ROUTE} replace />;
  }

  return <Outlet />;
}
