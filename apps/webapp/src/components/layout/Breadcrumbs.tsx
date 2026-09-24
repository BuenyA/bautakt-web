import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { HOME_ROUTE } from '@/lib/routes';

import { navGroups, settingsNavItem } from './navItems';

/**
 * Wo man gerade ist — Bereich und, auf einer Detailseite, der Eintrag.
 *
 * Bewusst aus der Nav-Tabelle abgeleitet und nicht aus dem Pfad geraten: so
 * heisst der Bereich in der Brotkrume genauso wie in der Seitenleiste. Fuer die
 * Detailseite steht hier nur ein neutraler Titel; den Namen des Datensatzes
 * kennt erst die Seite selbst.
 */
export function Breadcrumbs({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const allItems = [...navGroups.flatMap((group) => group.items), settingsNavItem];
  const area = allItems.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  if (!area) return null;

  const isDetail = pathname !== area.to;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="hidden md:inline-flex">
          <BreadcrumbLink asChild>
            <Link to={HOME_ROUTE}>{t('common:app.name')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:inline-flex" />

        <BreadcrumbItem>
          {isDetail ? (
            <BreadcrumbLink asChild>
              <Link to={area.to}>{t(area.labelKey)}</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{t(area.labelKey)}</BreadcrumbPage>
          )}
        </BreadcrumbItem>

        {isDetail ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate">{t('common:nav.detail')}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
