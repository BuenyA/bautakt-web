import { useTranslation } from 'react-i18next';

import { UnsavedChangesGuard } from '@/components/common/UnsavedChangesGuard';
import { SubNavLayout } from '@/components/layout/SubNavLayout';
import { useMembership } from '@/features/company/useMembership';
import { routes } from '@/lib/routes';

import { useCompanyNavGroups } from './companyNav';

export function CompanyLayout() {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const groups = useCompanyNavGroups();

  return (
    <UnsavedChangesGuard>
      <SubNavLayout
        title={t('companySettings:title')}
        subtitle={membership?.companyName}
        basePath={routes.company}
        groups={groups}
        indexPage
        ariaLabel={t('companySettings:nav.label')}
      />
    </UnsavedChangesGuard>
  );
}
