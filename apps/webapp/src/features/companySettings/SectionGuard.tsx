import { SkeletonBlock } from '@bautakt/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { useMembership } from '@/features/company/useMembership';
import { routes } from '@/lib/routes';

/**
 * Abschnitt nur mit Recht, sonst „Kein Zugriff“ — für den Direktaufruf der
 * Adresse. ⚠️ Führung, keine Kontrolle: die Grenze ist RLS.
 */
export function SectionGuard({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  const { isLoading } = useMembership();

  if (isLoading) return <SkeletonBlock className="h-64 w-full max-w-3xl" />;
  if (allowed) return <>{children}</>;

  return (
    <EmptyState
      title={t('common:forbidden.title')}
      description={t('common:forbidden.description')}
      action={<LinkButton to={routes.company}>{t('companySettings:backToOverview')}</LinkButton>}
    />
  );
}
