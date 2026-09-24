import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@bautakt/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { PageHeader } from '@/components/common/PageHeader';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

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
            'name, type, street_address, postal_code, city, country, email, phone_number, tax_number, vat_id, trade_register, iban, bic, bank_name, invoice_prefix, next_invoice_number, payment_term_days, is_small_business',
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
 * Einrichtung — vorerst lesend.
 *
 * ⚠️ Die Firmenstammdaten sind keine Einstellung wie eine Farbe: Steuernummer
 * und Rechnungsnummernkreis stehen auf jedem Beleg und sind nach dem
 * Festschreiben unveraenderlich. Bearbeitet wird das bis auf Weiteres in der
 * Handy-App, wo die Pruefungen dafuer bereits sitzen.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCompanySettings();
  const company = data?.company;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:settings.title')}
        description={t('domain:settings.description')}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full max-w-3xl" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <DetailCard title={t('domain:settings.company')} className="xl:col-span-2">
            <DetailRow label={t('domain:settings.name')} value={company?.name ?? ''} />
            <DetailRow
              label={t('domain:settings.address')}
              value={[
                company?.street_address,
                [company?.postal_code, company?.city].filter(Boolean).join(' '),
                company?.country,
              ]
                .filter(Boolean)
                .join('\n')}
            />
            <DetailRow label={t('domain:settings.email')} value={company?.email ?? ''} />
            <DetailRow label={t('domain:settings.phone')} value={company?.phone_number ?? ''} />
          </DetailCard>

          <DetailCard title={t('domain:settings.tax')}>
            <DetailRow label={t('domain:invoices.taxNumber')} value={company?.tax_number ?? ''} />
            <DetailRow label={t('domain:invoices.vatId')} value={company?.vat_id ?? ''} />
            <DetailRow
              label={t('domain:settings.tradeRegister')}
              value={company?.trade_register ?? ''}
            />
            <DetailRow
              label={t('domain:settings.smallBusiness')}
              value={
                company?.is_small_business
                  ? t('domain:settings.smallBusinessYes')
                  : t('domain:settings.smallBusinessNo')
              }
            />
          </DetailCard>

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
            <DetailRow label="IBAN" value={company?.iban ?? ''} />
            <DetailRow label={t('domain:settings.bank')} value={company?.bank_name ?? ''} />
          </DetailCard>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t('domain:settings.roles')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(data?.roles ?? []).map((role) => (
                <Badge key={role.id} variant={role.is_system ? 'accent' : 'outline'}>
                  {role.name}
                </Badge>
              ))}
              {data?.roles.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('domain:settings.noRoles')}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-text-subtle max-w-3xl text-xs">{t('domain:settings.editHint')}</p>
    </div>
  );
}
