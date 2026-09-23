import { eurosToMinor, formatMoney, vatByRateGroups } from '@bautakt/finance';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { PageSpinner } from '@/components/common/PageSpinner';
import { useMembership } from '@/features/company/useMembership';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';

import { useSalesDocument } from '../useSalesDocument';

/** Absenderangaben des Betriebs — Pflichtbestandteil jeder Rechnung. */
function useCompanyLetterhead() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['company-letterhead', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(
          'name, street_address, postal_code, city, country, email, phone_number, tax_number, vat_id, iban, bic, bank_name, invoice_footer_text, is_small_business',
        )
        .eq('id', companyId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Druckansicht eines Belegs.
 *
 * ⚠️ Bewusst ohne Shell: kein Menue, keine Topbar, nichts, was auf Papier
 * landen darf. Das Ausgabeformat ist der Browser-Druck (und darueber „Als PDF
 * speichern") — damit schliesst das Web die Luecke, die die Handy-App bis heute
 * hat: dort gibt es keinen Weg, dem Kunden die eigentliche Rechnung zuzustellen
 * (`finance-document-send` liefert 501, siehe Wiki der App).
 *
 * Die Zahlen kommen aus dem Beleg, nicht aus einer Neuberechnung: ein
 * festgeschriebener Beleg ist unveraenderlich, und was gedruckt wird, muss dem
 * entsprechen, was in der Datenbank steht.
 */
export function InvoicePrintPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useSalesDocument(id);
  const { data: company } = useCompanyLetterhead();

  useEffect(() => {
    if (data) document.title = data.document_number || t('domain:invoices.draftTitle');
  }, [data, t]);

  if (isLoading || !data) return <PageSpinner />;

  const vatGroups = vatByRateGroups(
    data.lines.map((line) => ({
      netMinor: eurosToMinor(line.net_amount),
      taxRatePercent: line.tax_rate_percent,
    })),
  );

  return (
    <div className="bautakt-print bg-background text-foreground mx-auto max-w-[210mm] p-10 print:p-0">
      <header className="flex items-start justify-between gap-8">
        <div className="text-sm">
          <p className="text-foreground text-lg font-semibold">{company?.name}</p>
          <p className="text-muted-foreground whitespace-pre-line">
            {[
              company?.street_address,
              [company?.postal_code, company?.city].filter(Boolean).join(' '),
            ]
              .filter(Boolean)
              .join('\n')}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-foreground text-xl font-semibold">
            {t(`domain:documentType.${data.type}`, { defaultValue: data.type })}
          </p>
          <p className="text-muted-foreground">{data.document_number}</p>
        </div>
      </header>

      <section className="mt-10 flex items-end justify-between gap-8 text-sm">
        <div>
          <p className="text-text-subtle text-xs">{t('domain:invoices.recipient')}</p>
          <p className="text-foreground font-medium">{data.customer_label}</p>
        </div>
        <dl className="text-right">
          <PrintRow
            label={t('domain:invoices.columns.issueDate')}
            value={formatDate(data.issue_date)}
          />
          <PrintRow
            label={t('domain:invoices.serviceDate')}
            value={formatDate(data.service_date)}
          />
          <PrintRow
            label={t('domain:invoices.columns.dueDate')}
            value={formatDate(data.due_date)}
          />
        </dl>
      </section>

      {data.intro_text ? (
        <p className="text-text-secondary mt-8 text-sm whitespace-pre-line">{data.intro_text}</p>
      ) : null}

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-border-strong border-b text-left">
            <th className="py-2 font-medium">{t('domain:invoices.lineColumns.title')}</th>
            <th className="py-2 text-right font-medium">
              {t('domain:invoices.lineColumns.quantity')}
            </th>
            <th className="py-2 text-right font-medium">
              {t('domain:invoices.lineColumns.unitPrice')}
            </th>
            <th className="py-2 text-right font-medium">{t('domain:invoices.lineColumns.tax')}</th>
            <th className="py-2 text-right font-medium">{t('domain:invoices.lineColumns.net')}</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line) => (
            <tr key={line.id} className="border-border border-b align-top">
              <td className="py-2">
                <span className="font-medium">{line.title}</span>
                {line.description ? (
                  <span className="text-muted-foreground block text-xs whitespace-pre-line">
                    {line.description}
                  </span>
                ) : null}
              </td>
              <td className="py-2 text-right tabular-nums">
                {line.quantity} {line.unit}
              </td>
              <td className="py-2 text-right tabular-nums">
                {formatMoney(eurosToMinor(line.unit_price))}
              </td>
              <td className="py-2 text-right tabular-nums">{line.tax_rate_percent} %</td>
              <td className="py-2 text-right tabular-nums">
                {formatMoney(eurosToMinor(line.net_amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-6 flex w-64 flex-col gap-1 text-sm">
        <PrintRow
          label={t('domain:invoices.net')}
          value={formatMoney(eurosToMinor(data.net_total))}
        />
        {vatGroups.map((group) => (
          <PrintRow
            key={group.rate}
            label={t('domain:invoices.vatAt', { rate: group.rate })}
            value={formatMoney(group.vatMinor)}
          />
        ))}
        <div className="border-border-strong mt-1 border-t pt-1">
          <PrintRow
            label={t('domain:invoices.gross')}
            value={formatMoney(eurosToMinor(data.gross_total))}
            strong
          />
        </div>
      </dl>

      {company?.is_small_business ? (
        <p className="text-muted-foreground mt-6 text-xs">
          {t('domain:invoices.smallBusinessNote')}
        </p>
      ) : null}

      {data.footer_text ? (
        <p className="text-text-secondary mt-8 text-sm whitespace-pre-line">{data.footer_text}</p>
      ) : null}

      <footer className="border-border text-muted-foreground mt-12 grid grid-cols-3 gap-4 border-t pt-4 text-xs">
        <div>
          <p>{company?.name}</p>
          <p>{company?.street_address}</p>
          <p>{[company?.postal_code, company?.city].filter(Boolean).join(' ')}</p>
        </div>
        <div>
          <p>{company?.email}</p>
          <p>{company?.phone_number}</p>
          <p>
            {company?.tax_number ? `${t('domain:invoices.taxNumber')}: ${company.tax_number}` : ''}
          </p>
          <p>{company?.vat_id ? `${t('domain:invoices.vatId')}: ${company.vat_id}` : ''}</p>
        </div>
        <div>
          <p>{company?.bank_name}</p>
          <p>{company?.iban ? `IBAN ${company.iban}` : ''}</p>
          <p>{company?.bic ? `BIC ${company.bic}` : ''}</p>
        </div>
      </footer>
    </div>
  );
}

function PrintRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</dt>
      <dd className={strong ? 'font-semibold tabular-nums' : 'tabular-nums'}>{value}</dd>
    </div>
  );
}
