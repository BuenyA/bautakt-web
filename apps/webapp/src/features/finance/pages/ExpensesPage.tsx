import { daysBetween, eurosToMinor, formatMoney, todayIso } from '@bautakt/finance';
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Uicon,
} from '@bautakt/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { usePermission } from '@/features/company/usePermission';
import { formatDate } from '@/lib/format';

import { ExpenseSheet } from '../ExpenseSheet';
import {
  type ExpenseRow,
  type IncomingInvoiceListRow,
  useExpenses,
  useIncomingInvoiceList,
} from '../useExpenses';

/**
 * Ausgaben in zwei Registern: Eingangsrechnungen (was zu zahlen ist) und
 * sonstige Ausgaben (was bereits gebucht ist). In der Handy-App liegt beides
 * unter „Ausgaben"; hier bleibt es zusammen, aber sichtbar getrennt — die eine
 * Liste ist eine Aufgabe, die andere eine Auswertung.
 */
export function ExpensesPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('bereich') === 'sonstige' ? 'expenses' : 'incoming';

  const canManage = usePermission('canManageOverheadCosts');
  const [sheetOpen, setSheetOpen] = useState(false);
  const incoming = useIncomingInvoiceList();
  const expenses = useExpenses();

  const incomingColumns = useMemo<DataTableColumn<IncomingInvoiceListRow>[]>(
    () => [
      {
        accessorKey: 'invoice_number',
        header: t('domain:expenses.columns.number'),
        cell: ({ row }) => (
          <span className="text-foreground font-medium whitespace-nowrap">
            {row.original.invoice_number || t('domain:invoices.noNumber')}
          </span>
        ),
      },
      { accessorKey: 'vendor_name', header: t('domain:expenses.columns.vendor') },
      {
        accessorKey: 'invoice_date',
        header: t('domain:expenses.columns.date'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.invoice_date)}
          </span>
        ),
      },
      {
        accessorKey: 'due_date',
        header: t('domain:expenses.columns.due'),
        cell: ({ row }) => <DueCell dueDate={row.original.due_date} status={row.original.status} />,
      },
      {
        accessorKey: 'gross_total',
        header: t('domain:expenses.columns.gross'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(eurosToMinor(row.original.gross_total))}
          </span>
        ),
      },
    ],
    [t],
  );

  const expenseColumns = useMemo<DataTableColumn<ExpenseRow>[]>(
    () => [
      {
        accessorKey: 'title',
        header: t('domain:expenses.columns.title'),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="text-foreground font-medium">{row.original.title}</span>
            {row.original.is_calculatory ? (
              <Badge variant="muted">{t('domain:expenses.calculatory')}</Badge>
            ) : null}
          </span>
        ),
      },
      { accessorKey: 'vendor', header: t('domain:expenses.columns.vendor') },
      { accessorKey: 'category_name', header: t('domain:expenses.columns.category') },
      {
        accessorKey: 'invoice_date',
        header: t('domain:expenses.columns.date'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.invoice_date)}
          </span>
        ),
      },
      {
        accessorKey: 'amount_net',
        header: t('domain:expenses.columns.net'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(eurosToMinor(row.original.amount_net))}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:expenses.title')}
        description={t('domain:expenses.description')}
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Uicon name="plus" size={16} />
              {t('domain:expenseForm.title')}
            </Button>
          ) : null
        }
      />

      <Tabs
        value={tab}
        onValueChange={(next) =>
          setSearchParams(next === 'expenses' ? { bereich: 'sonstige' } : {}, { replace: true })
        }
      >
        <TabsList>
          <TabsTrigger value="incoming">{t('domain:expenses.tabIncoming')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('domain:expenses.tabExpenses')}</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          <DataTable
            columns={incomingColumns}
            data={incoming.data ?? []}
            isLoading={incoming.isLoading}
            labels={labels}
            exportFileName="eingangsrechnungen"
            empty={
              <EmptyState
                title={t('domain:expenses.emptyIncomingTitle')}
                description={t('domain:expenses.emptyIncomingDescription')}
              />
            }
          />
        </TabsContent>

        <TabsContent value="expenses">
          <DataTable
            columns={expenseColumns}
            data={expenses.data ?? []}
            isLoading={expenses.isLoading}
            labels={labels}
            exportFileName="ausgaben"
            empty={
              <EmptyState
                title={t('domain:expenses.emptyExpensesTitle')}
                description={t('domain:expenses.emptyExpensesDescription')}
              />
            }
          />
        </TabsContent>
      </Tabs>

      <ExpenseSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

/** Faellig, bald faellig oder ueberfaellig — bezahlt ist neutral. */
function DueCell({ dueDate, status }: { dueDate: string | null; status: string }) {
  const { t } = useTranslation();
  if (!dueDate) return <span className="text-muted-foreground">—</span>;

  const days = daysBetween(todayIso(), dueDate);
  const paid = status === 'paid';
  const tone = paid
    ? 'text-muted-foreground'
    : days < 0
      ? 'text-destructive'
      : days <= 7
        ? 'text-warning'
        : 'text-muted-foreground';

  return (
    <span className={`${tone} whitespace-nowrap`}>
      {formatDate(dueDate)}
      {!paid && days < 0 ? ` · ${t('domain:expenses.overdue', { count: -days })}` : ''}
    </span>
  );
}
