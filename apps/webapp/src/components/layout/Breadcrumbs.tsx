import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@bautakt/ui';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { HOME_ROUTE } from '@/lib/routes';

import { breadcrumbModel } from './navItems';

/**
 * Wo man gerade ist — Bereich und, auf einer Detailseite, der Eintrag.
 *
 * Abgeleitet aus der Nav, nicht aus dem Pfad geraten: der Bereich heisst in
 * der Brotkrume genauso wie in der Seitenleiste. Hub-Ziele zeigen den Hub
 * davor (`Finanzen / Rechnungen`). Den Namen des Datensatzes kennt erst die
 * Seite selbst; hier steht nur „Detail".
 */
export function Breadcrumbs({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const model = breadcrumbModel(pathname);

  if (!model) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="hidden md:inline-flex">
          <BreadcrumbLink asChild>
            <Link to={HOME_ROUTE}>{t('common:app.name')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:inline-flex" />

        {model.crumbs.map((crumb, index) => {
          const isLast = index === model.crumbs.length - 1;
          const current = isLast && !model.detail;

          return (
            <Fragment key={`${crumb.to}:${crumb.labelKey}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {current ? (
                  <BreadcrumbPage className="truncate">{t(crumb.labelKey)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{t(crumb.labelKey)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}

        {model.detail ? (
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
