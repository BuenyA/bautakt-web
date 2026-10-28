import { daysBetween, eurosToMinor, formatMoney, todayIso } from '@bautakt/finance';
import { cn, DataTable, type DataTableColumn, StatusBadge, type StatusTone } from '@bautakt/ui';
import { Button, Text } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useCreateFromUrl } from '@/components/common/useCreateFromUrl';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDate } from '@/lib/format';
import { createIncomingInvoice } from '@/lib/routes';

import { isEInvoiceIncoming } from '../archiveFiles';
import { EInvoiceBadge } from '../EInvoiceBadge';
import { ExpenseSheet } from '../ExpenseSheet';
import { FinanceHeader } from '../FinanceHeader';
import { IncomingInvoiceSheet } from '../IncomingInvoiceSheet';
import {
  type ExpenseRow,
  type IncomingInvoiceListRow,
  useExpenses,
  useIncomingInvoiceList,
} from '../useExpenses';

/**
 * Ausgaben in zwei Listen nebeneinander: Eingangsrechnungen (was zu zahlen
 * ist) und sonstige Ausgaben (was bereits gebucht ist), letztere nur, wenn
 * es welche gibt. In der Handy-App liegt
 * beides unter „Ausgaben"; hier bleibt es zusammen, aber sichtbar getrennt —
 * die eine Liste ist eine Aufgabe, die andere eine Auswertung. Keine zweite
 * Reiterleiste unter den Bereichs-Reitern (Owner 17.10.2026).
 */
export function ExpensesPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();

  const canManage = usePermission('canManageOverheadCosts');
  const [sheetOpen, setSheetOpen] = useState(false);
  // `undefined`: zu, `null`: neue Eingangsrechnung, sonst die geöffnete.
  const [incomingId, setIncomingId] = useState<string | null | undefined>(undefined);
  // `?neu=1` aus der Schnellsuche öffnet das Anlege-Panel.
  useCreateFromUrl(canManage, () => setSheetOpen(true));
  // `?neu=eingangsrechnung` (Rechnungs-Übersicht) öffnet das Eingangsrechnungs-Panel.
  useCreateFromUrl(canManage, () => setIncomingId(null), createIncomingInvoice);
  const incoming = useIncomingInvoiceList();
  const expenses = useExpenses();

  const isLoading = useCompanyListLoading(incoming, expenses);
  // Sonstige Ausgaben nur zeigen, wenn wirklich welche angefallen sind.
  const hasExpenses = (expenses.data?.length ?? 0) > 0;

  const incomingColumns = useMemo<DataTableColumn<IncomingInvoiceListRow>[]>(
    () => [
      {
        accessorKey: 'invoice_number',
        header: t('domain:expenses.columns.number'),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <span className="text-foreground font-medium whitespace-nowrap">
              {row.original.invoice_number || t('domain:invoices.noNumber')}
            </span>
            {isEInvoiceIncoming(row.original) ? <EInvoiceBadge /> : null}
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
        accessorKey: 'status',
        header: t('domain:incomingInvoiceForm.status'),
        cell: ({ row }) => (
          <StatusBadge tone={STATUS_TONE[row.original.status] ?? 'neutral'}>
            {t(`domain:incomingInvoiceStatus.${row.original.status}`, {
              defaultValue: row.original.status,
            })}
          </StatusBadge>
        ),
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
              <StatusBadge tone="neutral">{t('domain:expenses.calculatory')}</StatusBadge>
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
      <FinanceHeader
        description={t('domain:expenses.description')}
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setSheetOpen(true)} icon={<AddRegular />}>
                {t('domain:expenseForm.title')}
              </Button>
              <Button
                appearance="primary"
                onClick={() => setIncomingId(null)}
                icon={<AddRegular />}
              >
                {t('domain:incomingInvoiceForm.title')}
              </Button>
            </div>
          ) : null
        }
      />

      <div className={cn('grid gap-6', hasExpenses && 'xl:grid-cols-2')}>
        <ListSection title={t('domain:expenses.tabIncoming')}>
          <DataTable
            columns={incomingColumns}
            data={incoming.data ?? []}
            isLoading={isLoading}
            labels={labels}
            exportFileName="eingangsrechnungen"
            onRowClick={canManage ? (row) => setIncomingId(row.id) : undefined}
            empty={
              <EmptyState
                title={t('domain:expenses.emptyIncomingTitle')}
                description={t('domain:expenses.emptyIncomingDescription')}
              />
            }
          />
        </ListSection>

        {hasExpenses ? (
          <ListSection title={t('domain:expenses.tabExpenses')}>
            <DataTable
              columns={expenseColumns}
              data={expenses.data ?? []}
              isLoading={isLoading}
              labels={labels}
              exportFileName="ausgaben"
              empty={
                <EmptyState
                  title={t('domain:expenses.emptyExpensesTitle')}
                  description={t('domain:expenses.emptyExpensesDescription')}
                />
              }
            />
          </ListSection>
        ) : null}
      </div>

      <ExpenseSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <IncomingInvoiceSheet
        open={incomingId !== undefined}
        invoiceId={incomingId ?? null}
        onOpenChange={(open) => {
          if (!open) setIncomingId(undefined);
        }}
      />
    </div>
  );
}

const STATUS_TONE: Record<string, StatusTone> = {
  draft: 'outline',
  open: 'brand',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
};

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

function ListSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <Text as="h2" size={400} weight="semibold">
        {title}
      </Text>
      {children}
    </section>
  );
}
