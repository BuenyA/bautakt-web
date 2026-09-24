import { eurosToMinor, formatMoney } from '@bautakt/finance';
import {
  Button,
  DataTable,
  type DataTableColumn,
  Tabs,
  TabsList,
  TabsTrigger,
  Uicon,
} from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { DocumentStatusBadge } from '../DocumentStatusBadge';
import { useFinanceAccess } from '../useFinanceAccess';
import {
  INVOICE_TYPE_LIST,
  type SalesDocumentListRow,
  useSalesDocuments,
} from '../useSalesDocuments';

type StatusFilter = 'all' | 'open' | 'overdue' | 'draft' | 'paid';

const OPEN_STATUSES = new Set(['issued', 'sent', 'partially_paid', 'overdue']);

function filterFromSearch(value: string | null): StatusFilter {
  switch (value) {
    case 'offen':
      return 'open';
    case 'ueberfaellig':
      return 'overdue';
    case 'entwurf':
      return 'draft';
    case 'bezahlt':
      return 'paid';
    default:
      return 'all';
  }
}

const SEARCH_VALUE: Record<StatusFilter, string | null> = {
  all: null,
  open: 'offen',
  overdue: 'ueberfaellig',
  draft: 'entwurf',
  paid: 'bezahlt',
};

function matchesFilter(document: SalesDocumentListRow, filter: StatusFilter): boolean {
  switch (filter) {
    case 'open':
      return OPEN_STATUSES.has(document.status);
    case 'overdue':
      return document.status === 'overdue';
    case 'draft':
      return document.status === 'draft';
    case 'paid':
      return document.status === 'paid';
    default:
      return true;
  }
}

export function InvoicesListPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const navigate = useNavigate();
  const access = useFinanceAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = filterFromSearch(searchParams.get('status'));
  const { data, isLoading, isError, refetch } = useSalesDocuments(INVOICE_TYPE_LIST);

  function setFilter(next: string) {
    const value = SEARCH_VALUE[next as StatusFilter];
    setSearchParams(value ? { status: value } : {}, { replace: true });
  }

  const rows = useMemo(
    () => (data ?? []).filter((document) => matchesFilter(document, filter)),
    [data, filter],
  );

  const columns = useMemo<DataTableColumn<SalesDocumentListRow>[]>(
    () => [
      {
        accessorKey: 'document_number',
        header: t('domain:invoices.columns.number'),
        cell: ({ row }) => (
          <Link
            to={routes.invoice(row.original.id)}
            className="text-foreground hover:text-primary font-medium whitespace-nowrap hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.document_number || t('domain:invoices.noNumber')}
          </Link>
        ),
      },
      {
        accessorKey: 'customer_label',
        header: t('domain:invoices.columns.customer'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.customer_label || t('domain:invoices.noCustomer')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('domain:invoices.columns.status'),
        cell: ({ row }) => <DocumentStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'issue_date',
        header: t('domain:invoices.columns.issueDate'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.issue_date) || t('domain:invoices.notIssued')}
          </span>
        ),
      },
      {
        accessorKey: 'due_date',
        header: t('domain:invoices.columns.dueDate'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.due_date) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'gross_total',
        header: t('domain:invoices.columns.gross'),
        // Rechtsbuendig und mit gleichen Ziffernbreiten: eine Betragsspalte
        // liest man von unten nach oben, und dafuer muessen die Stellen
        // untereinander stehen.
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
        <PageHeader
          title={t('domain:invoices.listTitle')}
          description={t('domain:invoices.listDescription')}
        />
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
        title={t('domain:invoices.listTitle')}
        description={t('domain:invoices.listDescription')}
        actions={
          access.canWriteSalesDocuments ? (
            <Button asChild size="sm">
              <Link to={routes.invoiceNew}>
                <Uicon name="plus" size={16} />
                {t('domain:invoices.new')}
              </Link>
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        labels={labels}
        exportFileName="rechnungen"
        onRowClick={(document) => void navigate(routes.invoice(document.id))}
        toolbar={
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList aria-label={t('domain:invoices.filtersLabel')}>
              <TabsTrigger value="all">{t('domain:invoices.filterAll')}</TabsTrigger>
              <TabsTrigger value="open">{t('domain:invoices.filterOpen')}</TabsTrigger>
              <TabsTrigger value="overdue">{t('domain:invoices.filterOverdue')}</TabsTrigger>
              <TabsTrigger value="draft">{t('domain:invoices.filterDrafts')}</TabsTrigger>
              <TabsTrigger value="paid">{t('domain:invoices.filterPaid')}</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        empty={
          <EmptyState
            title={t('domain:invoices.emptyTitle')}
            description={t('domain:invoices.emptyDescription')}
          />
        }
      />
    </div>
  );
}
