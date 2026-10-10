import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
} from '@fluentui/react-components';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { useRouterLink } from '@/components/common/useRouterLink';
import { HOME_ROUTE } from '@/lib/routes';

import { breadcrumbModel } from './navItems';
import { useMediaQuery } from './useMediaQuery';

function CrumbLink({ to, children }: { to: string; children: string }) {
  const link = useRouterLink(to);
  return (
    <BreadcrumbButton as="a" href={link.href} onClick={link.onClick}>
      {children}
    </BreadcrumbButton>
  );
}

/**
 * Wo man gerade ist — Bereich und, auf einer Detailseite, der Eintrag.
 *
 * Abgeleitet aus der Nav, nicht aus dem Pfad geraten: der Bereich heisst in
 * der Brotkrume genauso wie in der Seitenleiste. Hub-Ziele zeigen den Hub
 * davor (`Finanzen / Rechnungen`). Den Namen des Datensatzes kennt erst die
 * Seite selbst; hier steht nur „Detail".
 */
export function Breadcrumbs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const model = breadcrumbModel(pathname);
  // Per Media-Query statt `hidden md:flex`: Fluent setzt `display` ungeschichtet,
  // Tailwinds Utilities liegen in einer Layer und verlören.
  const wide = useMediaQuery('(min-width: 768px)');

  if (!model) return null;

  return (
    <Breadcrumb aria-label={t('common:nav.breadcrumb')}>
      {wide ? (
        <>
          <BreadcrumbItem>
            <CrumbLink to={HOME_ROUTE}>{t('common:app.name')}</CrumbLink>
          </BreadcrumbItem>
          <BreadcrumbDivider />
        </>
      ) : null}

      {model.crumbs.map((crumb, index) => {
        const isLast = index === model.crumbs.length - 1;
        const current = isLast && !model.detail;

        return (
          <Fragment key={`${crumb.to}:${crumb.labelKey}`}>
            {index > 0 ? <BreadcrumbDivider /> : null}
            <BreadcrumbItem>
              {current ? (
                <BreadcrumbButton current>{t(crumb.labelKey)}</BreadcrumbButton>
              ) : (
                <CrumbLink to={crumb.to}>{t(crumb.labelKey)}</CrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        );
      })}

      {model.detail ? (
        <>
          <BreadcrumbDivider />
          <BreadcrumbItem>
            <BreadcrumbButton current>{t('common:nav.detail')}</BreadcrumbButton>
          </BreadcrumbItem>
        </>
      ) : null}
    </Breadcrumb>
  );
}
