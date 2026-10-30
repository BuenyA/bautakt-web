import { SkeletonBlock, StatusBadge } from '@bautakt/ui';
import { Card, CardHeader, Text } from '@fluentui/react-components';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { PageHeader } from '@/components/common/PageHeader';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { ContactNumberSettingsCard } from '@/features/contacts/ContactNumberSettingsCard';
import { supabase } from '@/lib/supabase';

import { BankCard, CompanyCard, LegalCard, RegisterCard } from '../CompanyForms';
import { DatevSettingsCard } from '../DatevSettingsCard';
import { InvoiceTemplatesCard } from '../InvoiceTemplatesCard';
import { MailSettingsCard } from '../MailSettingsCard';

/** Stammdaten des Betriebs und die Rollen, die es hier gibt. */
function useCompanySettings() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['company-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [company, roles] = await Promise.all([
        supabase
          .from('companies')
          .select(
            'name, type, street_address, postal_code, city, country, email, phone_number, tax_number, vat_id, trade_register, legal_form, register_court, managing_directors, registered_office, iban, bic, bank_name, invoice_prefix, next_invoice_number, payment_term_days, is_small_business',
          )
          .eq('id', companyId!)
          .maybeSingle(),
        supabase
          .from('company_roles')
          .select('id, name, is_system, system_key, sort_order')
          .eq('company_id', companyId!)
          .order('sort_order', { ascending: true }),
      ]);

      if (company.error) throw company.error;
      if (roles.error) throw roles.error;

      return { company: company.data, roles: roles.data ?? [] };
    },
  });
}

/**
 * Einrichtung: Firma, Rechtliches und Bank sind bearbeitbar (#61), mit
 * denselben Prüfregeln wie die App (`companyValidation.ts`). Ohne das Recht
 * `canEditCompanyMasterData` bleibt alles lesend.
 *
 * Nummernkreis und Zahlungsziel bleiben hier vorerst lesend.
 *
 * Die Karten für E-Mail (#220) und DATEV (#167) prüfen ihre Rechte selbst und
 * fehlen ohne sie ganz.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCompanySettings();
  const company = data?.company;
  const canEdit = usePermission('canEditCompanyMasterData');
  // Nach dem Speichern starten die Formulare vom neuen Stand.
  const formKey = JSON.stringify(company);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:settings.title')}
        description={t('domain:settings.description')}
      />

      {isLoading ? (
        <SkeletonBlock className="h-64 w-full max-w-3xl" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {company ? (
            <>
              <div className="xl:col-span-2">
                <CompanyCard key={formKey} company={company} canEdit={canEdit} />
              </div>
              <RegisterCard key={`register-${formKey}`} company={company} canEdit={canEdit} />
              <LegalCard key={`legal-${formKey}`} company={company} canEdit={canEdit} />
              <BankCard key={`bank-${formKey}`} company={company} canEdit={canEdit} />
            </>
          ) : null}

          <DetailCard title={t('domain:settings.invoicing')}>
            <DetailRow
              label={t('domain:settings.invoicePrefix')}
              value={company?.invoice_prefix ?? ''}
            />
            <DetailRow
              label={t('domain:settings.nextNumber')}
              value={company ? String(company.next_invoice_number) : ''}
            />
            <DetailRow
              label={t('domain:invoices.paymentTerm')}
              value={company ? t('domain:invoices.days', { count: company.payment_term_days }) : ''}
            />
          </DetailCard>

          <ContactNumberSettingsCard />

          <InvoiceTemplatesCard />

          <MailSettingsCard />

          <DatevSettingsCard />

          <Card size="large" className="xl:col-span-2">
            <CardHeader
              header={
                <Text as="h2" size={400} weight="semibold">
                  {t('domain:settings.roles')}
                </Text>
              }
            />
            <div className="flex flex-wrap gap-2">
              {(data?.roles ?? []).map((role) => (
                <StatusBadge key={role.id} tone={role.is_system ? 'brand' : 'outline'}>
                  {role.name}
                </StatusBadge>
              ))}
              {data?.roles.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('domain:settings.noRoles')}</p>
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
