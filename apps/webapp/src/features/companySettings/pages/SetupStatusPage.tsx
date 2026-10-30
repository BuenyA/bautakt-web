import { SkeletonBlock, StatusBadge } from '@bautakt/ui';
import { ProgressBar, Text } from '@fluentui/react-components';
import {
  CheckmarkCircle20Filled,
  ChevronRight20Regular,
  Circle20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';

import { useRouterLink } from '@/components/common/useRouterLink';
import { SubPage } from '@/components/layout/SubNavLayout';
import { SectionCard } from '@/features/contacts/SectionCard';
import { routes } from '@/lib/routes';

import { type SetupCheck, useCompanySetup } from '../companySetup';

function CheckRow({ check }: { check: SetupCheck }) {
  const { t } = useTranslation();
  const link = useRouterLink(check.to);
  return (
    <li>
      <a
        href={link.href}
        onClick={link.onClick}
        className="hover:bg-muted flex items-center gap-3 rounded-md px-2 py-2 no-underline"
      >
        {check.done ? (
          <CheckmarkCircle20Filled className="text-success shrink-0" aria-hidden />
        ) : (
          <Circle20Regular className="text-muted-foreground shrink-0" aria-hidden />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <Text weight={check.done ? 'regular' : 'semibold'}>
              {t(`companySettings:setupStatus.checks.${check.key}.title`)}
            </Text>
            {check.optional ? (
              <StatusBadge tone="outline">{t('companySettings:setupStatus.optional')}</StatusBadge>
            ) : null}
          </span>
          {check.done ? null : (
            <Text className="text-muted-foreground">
              {t(`companySettings:setupStatus.checks.${check.key}.hint`)}
            </Text>
          )}
        </span>
        <span className="sr-only">
          {t(check.done ? 'companySettings:setupStatus.done' : 'companySettings:setupStatus.open')}
        </span>
        <ChevronRight20Regular className="text-muted-foreground shrink-0" aria-hidden />
      </a>
    </li>
  );
}

/**
 * Einrichtung: was dem Betrieb für Rechnungen und Mails noch fehlt. Den
 * Abschnitt gibt es nur, bis alles Nötige eingetragen ist; danach führt die
 * Adresse zurück in den Bereich Unternehmen.
 */
export function SetupStatusPage() {
  const { t } = useTranslation();
  const setup = useCompanySetup();

  if (!setup.isLoading && !setup.pending) return <Navigate to={routes.company} replace />;

  return (
    <SubPage
      title={t('companySettings:setupStatus.title')}
      description={t('companySettings:setupStatus.description')}
    >
      <SectionCard
        title={t('companySettings:setupStatus.progressTitle')}
        description={t('companySettings:setupStatus.hint')}
      >
        {setup.isLoading ? (
          <SkeletonBlock className="h-56 w-full" />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <ProgressBar
                value={setup.total ? setup.done / setup.total : 0}
                thickness="large"
                color="brand"
                aria-label={t('companySettings:setupStatus.progressTitle')}
              />
              <Text className="text-muted-foreground">
                {t('companySettings:setupStatus.progress', {
                  done: setup.done,
                  total: setup.total,
                })}
              </Text>
            </div>
            <ul className="flex flex-col">
              {setup.checks.map((check) => (
                <CheckRow key={check.key} check={check} />
              ))}
            </ul>
          </>
        )}
      </SectionCard>
    </SubPage>
  );
}
