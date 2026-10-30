import { SkeletonBlock } from '@bautakt/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';

import { useCompanyAccess } from '../companyAccess';
import { BankCard, CompanyCard, LegalCard, RegisterCard } from '../CompanyForms';
import { DatevSettingsCard } from '../DatevSettingsCard';
import { MailSettingsCard } from '../MailSettingsCard';
import { SectionGuard } from '../SectionGuard';
import { type CompanyRecord, useCompanyRecord } from '../useCompanyRecord';

/**
 * Lädt die Zeile des Betriebs und gibt sie an die Karten. Der Schlüssel aus
 * dem gespeicherten Stand setzt die Formulare nach dem Speichern zurück.
 */
function WithCompany({
  children,
}: {
  children: (company: CompanyRecord, key: string) => ReactNode;
}) {
  const { data, isLoading } = useCompanyRecord();
  if (isLoading) return <SkeletonBlock className="h-64 w-full" />;
  if (!data) return null;
  return <>{children(data, JSON.stringify(data))}</>;
}

/** Name, Gewerk, Anschrift und Kontakt. */
export function MasterDataPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  return (
    <SectionGuard allowed={access.masterData.view}>
      <SubPage
        title={t('companySettings:masterData.title')}
        description={t('companySettings:masterData.description')}
      >
        <WithCompany>
          {(company, key) => (
            <CompanyCard key={key} company={company} canEdit={access.masterData.edit} />
          )}
        </WithCompany>
      </SubPage>
    </SectionGuard>
  );
}

/** Rechtsform und Register (Pflichtangaben in Mails) sowie Steuer. */
export function LegalSettingsPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  return (
    <SectionGuard allowed={access.masterData.view}>
      <SubPage
        title={t('companySettings:legal.title')}
        description={t('companySettings:legal.description')}
      >
        <WithCompany>
          {(company, key) => (
            <>
              <LegalCard key={`tax-${key}`} company={company} canEdit={access.masterData.edit} />
              <RegisterCard
                key={`register-${key}`}
                company={company}
                canEdit={access.masterData.edit}
              />
            </>
          )}
        </WithCompany>
      </SubPage>
    </SectionGuard>
  );
}

/** Die Bankverbindung, die auf Rechnungen steht. */
export function BankPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  return (
    <SectionGuard allowed={access.masterData.view}>
      <SubPage
        title={t('companySettings:bank.title')}
        description={t('companySettings:bank.description')}
      >
        <WithCompany>
          {(company, key) => (
            <BankCard key={key} company={company} canEdit={access.masterData.edit} />
          )}
        </WithCompany>
      </SubPage>
    </SectionGuard>
  );
}

/** Wie Bautakt Belege für den Betrieb verschickt (#220). */
export function MailPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  return (
    <SectionGuard allowed={access.mail.view}>
      <SubPage
        title={t('companySettings:mail.title')}
        description={t('companySettings:mail.description')}
      >
        <MailSettingsCard />
      </SubPage>
    </SectionGuard>
  );
}

/** Kontenrahmen und Konten für den Export an die Steuerberatung (#167). */
export function DatevPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  return (
    <SectionGuard allowed={access.datev.view}>
      <SubPage
        title={t('companySettings:datev.title')}
        description={t('companySettings:datev.description')}
      >
        <DatevSettingsCard />
      </SubPage>
    </SectionGuard>
  );
}
