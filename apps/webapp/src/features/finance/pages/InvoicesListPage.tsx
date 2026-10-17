import { eurosToMinor, formatMoney } from '@bautakt/finance';
import { DataTable, type DataTableColumn } from '@bautakt/ui';
import { Link as FluentLink } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { RouterLink } from '@/components/common/RouterLink';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { DocumentStatusBadge } from '../DocumentStatusBadge';
import { FinanceHeader } from '../FinanceHeader';
import { invoiceStatusFromSearch, matchesInvoiceStatus } from '../invoiceListFilter';
import { useFinanceAccess } from '../useFinanceAccess';
import {
  FINANCE_LIST_TYPES,
  type SalesDocumentListRow,
  useSalesDocuments,
} from '../useSalesDocuments';

export function InvoicesListPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const navigate = useNavigate();
  const access = useFinanceAccess();
  const [searchParams] = useSearchParams();
  const statusFilter = invoiceStatusFromSearch(searchParams.get('status'));
  const documents = useSalesDocuments(FINANCE_LIST_TYPES);
  const { data, isError, refetch } = documents;

  const rows = useMemo(
    () =>
      // Keine Filter-Reiter unter den Bereichs-Reitern (Owner 17.10.2026):
      // Rechnungen, Auftragsbestätigungen und Lieferscheine stehen zusammen,
      // die Spalte „Art“ unterscheidet sie. `?status=` bleibt als Deep-Link.
      (data ?? []).filter((document) => matchesInvoiceStatus(document, statusFilter)),
    [data, statusFilter],
  );

  const hasAny = (data?.length ?? 0) > 0;

  const isLoading = useCompanyListLoading(documents);

  const columns = useMemo<DataTableColumn<SalesDocumentListRow>[]>(
    () => [
      {
        accessorKey: 'document_number',
        header: t('domain:invoices.columns.number'),
        cell: ({ row }) => (
          <RouterLink appearance="subtle" to={routes.invoice(row.original.id)} stopPropagation>
            <span className="font-medium whitespace-nowrap">
              {row.original.document_number || t('domain:invoices.noNumber')}
            </span>
          </RouterLink>
        ),
      },
      {
        accessorKey: 'type',
        header: t('domain:invoices.columns.type'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {t(`domain:documentType.${row.original.type}`, { defaultValue: row.original.type })}
          </span>
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
        <FinanceHeader description={t('domain:invoices.listDescription')} />
        <EmptyState
          title={t('domain:invoices.loadErrorTitle')}
          description={t('domain:invoices.loadErrorDescription')}
          action={
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FinanceHeader
        description={t('domain:invoices.listDescription')}
        actions={
          access.canWriteSalesDocuments ? (
            <LinkButton appearance="primary" to={routes.invoiceNew} icon={<AddRegular />}>
              {t('domain:invoices.new')}
            </LinkButton>
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
        empty={
          <EmptyState
            title={
              hasAny ? t('domain:invoices.emptyResultsTitle') : t('domain:invoices.emptyTitle')
            }
            description={
              hasAny
                ? t('domain:invoices.emptyResultsDescription')
                : t('domain:invoices.emptyDescription')
            }
          />
        }
      />
    </div>
  );
}
