import {
  eurosToMinor,
  formatMoney,
  monthlyRevenue,
  monthlyTotals,
  monthRange,
  todayIso,
} from '@bautakt/finance';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  type DataTableColumn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bautakt/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';

import { useExpenses, useIncomingInvoiceList } from '../useExpenses';
import { INVOICE_TYPE_LIST, useSalesDocuments } from '../useSalesDocuments';

type CustomerTotal = { customer: string; minor: number; count: number };

const RANGES = [6, 12, 24] as const;

/**
 * Auswertungen: Umsatz und Ausgaben je Monat, dazu die Kunden mit dem meisten
 * Umsatz.
 *
 * ⚠️ Umsatz und Ausgaben stehen in zwei getrennten Diagrammen, nicht in einem
 * mit zwei Achsen. Zwei Groessenordnungen auf einer Flaeche erzeugen einen
 * Zusammenhang, den die Daten nicht hergeben.
 */
export function ReportsPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const [months, setMonths] = useState<number>(12);

  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const expenses = useExpenses();
  const incoming = useIncomingInvoiceList();

  const isLoading = useCompanyListLoading(documents, expenses, incoming);

  const range = useMemo(() => monthRange(todayIso().slice(0, 7), months), [months]);

  const revenuePoints = useMemo(
    () => monthlyRevenue(documents.data ?? [], range),
    [documents.data, range],
  );

  const expensePoints = useMemo(() => {
    const entries = [
      ...(expenses.data ?? [])
        // Kalkulatorische Kosten sind nie geflossen — in einer Ausgabenreihe
        // waeren sie eine erfundene Zahlung.
        .filter((expense) => !expense.is_calculatory)
        .map((expense) => ({
          dateIso: expense.invoice_date,
          amount: expense.amount_net + expense.vat_amount,
        })),
      ...(incoming.data ?? []).map((invoice) => ({
        dateIso: invoice.invoice_date,
        amount: invoice.gross_total,
      })),
    ];
    return monthlyTotals(entries, range);
  }, [expenses.data, incoming.data, range]);

  const customerTotals = useMemo<CustomerTotal[]>(() => {
    const byCustomer = new Map<string, CustomerTotal>();
    for (const document of documents.data ?? []) {
      if (document.status === 'draft' || document.status === 'cancelled') continue;
      const key = document.customer_label || t('domain:invoices.noCustomer');
      const entry = byCustomer.get(key) ?? { customer: key, minor: 0, count: 0 };
      entry.minor += eurosToMinor(document.gross_total);
      entry.count += 1;
      byCustomer.set(key, entry);
    }
    return [...byCustomer.values()].sort((a, b) => b.minor - a.minor);
  }, [documents.data, t]);

  const revenueTotal = revenuePoints.reduce((sum, point) => sum + point.minor, 0);
  const expenseTotal = expensePoints.reduce((sum, point) => sum + point.minor, 0);

  const columns = useMemo<DataTableColumn<CustomerTotal>[]>(
    () => [
      { accessorKey: 'customer', header: t('domain:reports.columns.customer') },
      {
        accessorKey: 'count',
        header: t('domain:reports.columns.documents'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right tabular-nums">
            {row.original.count}
          </span>
        ),
      },
      {
        accessorKey: 'minor',
        header: t('domain:reports.columns.revenue'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(row.original.minor)}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:reports.title')}
        description={t('domain:reports.description')}
        actions={
          <Select value={String(months)} onValueChange={(value) => setMonths(Number(value))}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {t('domain:reports.lastMonths', { count: value })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('domain:reports.revenueTitle')}</CardTitle>
            <span className="text-foreground text-2xl font-semibold tabular-nums">
              {formatMoney(revenueTotal)}
            </span>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart points={revenuePoints} emptyLabel={t('domain:reports.noData')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('domain:reports.expenseTitle')}</CardTitle>
            <span className="text-foreground text-2xl font-semibold tabular-nums">
              {formatMoney(expenseTotal)}
            </span>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart points={expensePoints} emptyLabel={t('domain:reports.noData')} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-base font-semibold">
          {t('domain:reports.byCustomer')}
        </h2>
        <DataTable
          columns={columns}
          data={customerTotals}
          isLoading={isLoading}
          labels={labels}
          exportFileName="umsatz-je-kunde"
          empty={
            <EmptyState
              title={t('domain:reports.noData')}
              description={t('domain:reports.noDataDescription')}
            />
          }
        />
      </div>
    </div>
  );
}
