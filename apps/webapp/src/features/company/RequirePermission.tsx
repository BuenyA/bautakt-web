import { hasPermission, type PermissionKey } from '@bautakt/core';
import { Button } from '@bautakt/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageSpinner } from '@/components/common/PageSpinner';
import { HOME_ROUTE } from '@/lib/routes';

import { useMembership } from './useMembership';

/**
 * Zeigt den Inhalt nur, wenn eines der genannten Rechte vorliegt — sonst eine
 * Seite „Kein Zugriff".
 *
 * ⚠️ Das ist Fuehrung, keine Kontrolle. Wer die Adresse kennt, ruft sie
 * trotzdem auf; die verbindliche Grenze sind die RLS-Policies und die
 * `enforce_*`-Trigger. Der Nutzen hier ist ein anderer: ohne diesen Waechter
 * sieht der Direktaufruf eine leere Tabelle und damit aus wie ein Fehler der
 * Anwendung, statt wie eine fehlende Berechtigung.
 */
export function RequirePermission({
  anyOf,
  children,
}: {
  anyOf: PermissionKey[];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { data: membership, isLoading } = useMembership();

  if (isLoading) return <PageSpinner />;

  const allowed = anyOf.some((key) => hasPermission(membership?.permissions, key));
  if (allowed) return <>{children}</>;

  return (
    <EmptyState
      title={t('common:forbidden.title')}
      description={t('common:forbidden.description')}
      action={
        <Button asChild variant="outline" size="sm">
          <Link to={HOME_ROUTE}>{t('common:forbidden.action')}</Link>
        </Button>
      }
    />
  );
}
