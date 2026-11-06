import {
  Button,
  Link,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
} from '@fluentui/react-components';
import { Mail20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';
import { useMembership } from '@/features/company/useMembership';
import { SectionCard } from '@/features/contacts/SectionCard';
import { SUPPORT_EMAIL } from '@/lib/support';

import { useCompanyAccess } from '../companyAccess';
import { SectionGuard } from '../SectionGuard';

/**
 * Ein Betrieb wird nicht mehr sofort gelöscht (Löschkonzept E9, bautakt-app
 * wiki/pages/loeschkonzept.md): nach der Kündigung 30 Tage Export, dann Sperre,
 * Löschung an E+60. `delete_company_as_owner` ist für Clients gesperrt. Bis der
 * Antrag mit Karenz in der App steht (WP6), geht die Kündigung per Mail an den
 * Support.
 */
export function DeleteCompanyPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const { data: membership } = useMembership();
  const name = membership?.companyName ?? '';
  const subject = encodeURIComponent(t('companySettings:delete.mailSubject', { name }));
  const body = encodeURIComponent(
    t('companySettings:delete.mailBody', { name, id: membership?.companyId ?? '' }),
  );

  return (
    <SectionGuard allowed={access.danger.view}>
      <SubPage
        title={t('companySettings:delete.title')}
        description={t('companySettings:delete.description')}
      >
        <SectionCard title={t('companySettings:delete.cardTitle', { name })}>
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody>
              <MessageBarTitle>{t('companySettings:delete.noticeTitle')}</MessageBarTitle>
              {t('companySettings:delete.notice')}
            </MessageBarBody>
          </MessageBar>
          <ul className="text-muted-foreground list-disc pl-5 text-sm">
            <li>{t('companySettings:delete.steps.export')}</li>
            <li>{t('companySettings:delete.steps.access')}</li>
            <li>{t('companySettings:delete.steps.lock')}</li>
            <li>{t('companySettings:delete.steps.delete')}</li>
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              as="a"
              icon={<Mail20Regular />}
              href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}
            >
              {t('companySettings:delete.request')}
            </Button>
            <Text className="text-muted-foreground">
              {t('companySettings:delete.direct')}{' '}
              <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
            </Text>
          </div>
        </SectionCard>
      </SubPage>
    </SectionGuard>
  );
}
