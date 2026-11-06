import { Link, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { dayAfter, dayBefore } from './lifecycle';
import { useCompanyLifecycle } from './useCompanyLifecycle';

/**
 * Hinweis für den Inhaber ab Vertragsende (`export_only`): nur noch lesen und exportieren.
 * Schreiben lehnt die Datenbank ab (`COMPANY_READ_ONLY`), die Knöpfe bleiben deshalb stehen.
 * In der Bedenkzeit nach der Kündigung (WP6) sieht jeder Inhaber, bis wann er widerrufen kann.
 */
export function CompanyReadOnlyBanner() {
  const { t } = useTranslation();
  const { view } = useCompanyLifecycle();
  const exportLink = useRouterLink(routes.companyExport);
  const terminationLink = useRouterLink(routes.companyDelete);
  if (view.kind === 'terminating') {
    return (
      <MessageBar intent="warning" layout="multiline" className="mb-4">
        <MessageBarBody>
          <MessageBarTitle>{t('common:lifecycle.terminating.title')}</MessageBarTitle>
          {t('common:lifecycle.terminating.body', {
            end: formatDate(view.contractEnd),
            until: formatDate(dayBefore(view.contractEnd)),
          })}{' '}
          <Link href={terminationLink.href} onClick={terminationLink.onClick}>
            {t('common:lifecycle.terminating.link')}
          </Link>
        </MessageBarBody>
      </MessageBar>
    );
  }
  if (view.kind !== 'readOnly') return null;
  return (
    <MessageBar intent="warning" layout="multiline" className="mb-4">
      <MessageBarBody>
        <MessageBarTitle>{t('common:lifecycle.readOnly.title')}</MessageBarTitle>
        {t('common:lifecycle.readOnly.body', {
          end: formatDate(view.contractEnd),
          locked: formatDate(dayAfter(view.exportDeadline)),
        })}{' '}
        <Link href={exportLink.href} onClick={exportLink.onClick}>
          {t('common:lifecycle.readOnly.export')}
        </Link>
      </MessageBarBody>
    </MessageBar>
  );
}
