import { eurosToMinor, formatMoney } from '@bautakt/finance';
import { Button, DataTable, type DataTableColumn, Uicon } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { DocumentStatusBadge } from '../DocumentStatusBadge';
import { useFinanceAccess } from '../useFinanceAccess';
import {
  QUOTE_TYPE_LIST,
  type SalesDocumentListRow,
  useSalesDocuments,
} from '../useSalesDocuments';

export function QuotesListPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const access = useFinanceAccess();
  const { data, isLoading, isError, refetch } = useSalesDocuments(QUOTE_TYPE_LIST);

  const columns = useMemo<DataTableColumn<SalesDocumentListRow>[]>(
    () => [
      {
        accessorKey: 'document_number',
        header: t('domain:quotes.columns.number'),
        cell: ({ row }) => (
          <span className="text-foreground font-medium whitespace-nowrap">
            {row.original.document_number || t('domain:invoices.noNumber')}
          </span>
        ),
      },
      {
        accessorKey: 'customer_label',
        header: t('domain:quotes.columns.customer'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.customer_label || t('domain:invoices.noCustomer')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('domain:quotes.columns.status'),
        cell: ({ row }) => <DocumentStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'issue_date',
        header: t('domain:quotes.columns.issueDate'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.issue_date) || t('domain:invoices.notIssued')}
          </span>
        ),
      },
      {
        accessorKey: 'gross_total',
        header: t('domain:quotes.columns.gross'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(eurosToMinor(row.original.gross_total))}
          </span>
        ),
      },
    ],
    [t],
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:quotes.listTitle')} />
        <EmptyState
          title={t('domain:invoices.loadErrorTitle')}
          description={t('domain:invoices.loadErrorDescription')}
          action={
            <button
              type="button"
              className="text-primary cursor-pointer text-sm font-medium hover:underline"
              onClick={() => void refetch()}
            >
              {t('common:action.retry')}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:quotes.listTitle')}
        description={t('domain:quotes.listDescription')}
        actions={
          access.canWriteSalesDocuments ? (
            <Button asChild size="sm">
              <Link to={routes.quoteNew}>
                <Uicon name="plus" size={16} />
                {t('domain:quotes.new')}
              </Link>
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="angebote"
        empty={
          <EmptyState
            title={t('domain:quotes.emptyTitle')}
            description={t('domain:quotes.emptyDescription')}
          />
        }
      />
    </div>
  );
}
