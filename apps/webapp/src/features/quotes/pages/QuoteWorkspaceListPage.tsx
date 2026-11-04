import { eurosToMinor, formatMoney, type CurrencyCode } from '@bautakt/finance';
import { DataTable, type DataTableColumn } from '@bautakt/ui';
import { Card, Field, Link as FluentLink, MessageBar, Select } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { RouterLink } from '@/components/common/RouterLink';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import {
  berlinToday,
  matchesQuoteFilter,
  QUOTE_KINDS,
  QUOTE_STATUSES,
  quoteFigures,
  quoteKindFromSearch,
  type QuoteKindFilter,
  quoteKindToSearch,
  quoteStatusFromSearch,
  type QuoteStatusFilter,
  quoteStatusToSearch,
} from '../quoteList';
import { QuoteStatusBadge } from '../QuoteStatusBadge';
import { type QuoteOverviewRow, useQuoteOverview } from '../useQuotes';

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <li>
      <Card className="h-full">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-foreground text-xl font-semibold tabular-nums">{value}</p>
        {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
      </Card>
    </li>
  );
}

export function QuoteWorkspaceListPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = quoteStatusFromSearch(searchParams.get('status'));
  const kindFilter = quoteKindFromSearch(searchParams.get('art'));
  const quotes = useQuoteOverview();
  const { data, isError, refetch } = quotes;
  const isLoading = useCompanyListLoading(quotes);

  const rows = useMemo(
    () => (data ?? []).filter((row) => matchesQuoteFilter(row, statusFilter, kindFilter)),
    [data, statusFilter, kindFilter],
  );
  const figures = useMemo(() => quoteFigures(data ?? [], berlinToday()), [data]);
  const hasAny = (data?.length ?? 0) > 0;

  function setFilter(name: 'status' | 'art', value: string | null) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(name, value);
        else next.delete(name);
        return next;
      },
      { replace: true },
    );
  }

  const columns = useMemo<DataTableColumn<QuoteOverviewRow>[]>(
    () => [
      {
        accessorKey: 'document_number',
        header: t('domain:quotes.columns.number'),
        cell: ({ row }) => (
          <RouterLink
            appearance="subtle"
            to={routes.quoteWorkspaceDetail(row.original.id ?? '')}
            stopPropagation
          >
            <span className="font-medium whitespace-nowrap">
              {row.original.document_number || t('domain:quotes.workspace.noNumber')}
            </span>
          </RouterLink>
        ),
      },
      {
        accessorKey: 'kind',
        header: t('domain:quotes.workspace.kindLabel'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {t(`domain:quotes.workspace.kind.${row.original.kind ?? 'main'}`)}
          </span>
        ),
      },
      {
        accessorKey: 'subject',
        header: t('domain:quotes.workspace.subject'),
        cell: ({ row }) => <span className="text-foreground">{row.original.subject}</span>,
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
        cell: ({ row }) => <QuoteStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'valid_until',
        header: t('domain:quotes.workspace.validUntil'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.valid_until) || t('domain:quotes.workspace.noDate')}
          </span>
        ),
      },
      {
        accessorKey: 'net_total',
        header: t('domain:quotes.workspace.net'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(
              eurosToMinor(row.original.net_total),
              (row.original.currency ?? 'EUR') as CurrencyCode,
            )}
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
          title={t('domain:quotes.workspace.loadErrorTitle')}
          description={t('domain:quotes.workspace.loadErrorDescription')}
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
      <PageHeader
        title={t('domain:quotes.listTitle')}
        description={t('domain:quotes.listDescription')}
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label={t('domain:quotes.workspace.figures.open', { count: figures.openCount })}
          value={formatMoney(figures.openNetMinor)}
          note={t('domain:quotes.workspace.figures.netNote')}
        />
        <Figure
          label={t('domain:quotes.workspace.figures.accepted', { count: figures.acceptedCount })}
          value={formatMoney(figures.acceptedNetMinor)}
          note={t('domain:quotes.workspace.figures.netNote')}
        />
        <Figure
          label={t('domain:quotes.workspace.figures.expired')}
          value={String(figures.expiredCount)}
        />
        <Figure
          label={t('domain:quotes.workspace.figures.followUp')}
          value={String(figures.followUpDueCount)}
        />
      </ul>
      {figures.hasOtherCurrency ? (
        <MessageBar intent="info">{t('domain:quotes.workspace.figures.otherCurrency')}</MessageBar>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <Field label={t('domain:quotes.columns.status')}>
          <Select
            value={statusFilter}
            onChange={(_, option) =>
              setFilter('status', quoteStatusToSearch(option.value as QuoteStatusFilter))
            }
          >
            <option value="all">{t('domain:quotes.workspace.filterAll')}</option>
            {QUOTE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`domain:quotes.workspace.status.${status}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('domain:quotes.workspace.kindLabel')}>
          <Select
            value={kindFilter}
            onChange={(_, option) =>
              setFilter('art', quoteKindToSearch(option.value as QuoteKindFilter))
            }
          >
            <option value="all">{t('domain:quotes.workspace.filterAll')}</option>
            {QUOTE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`domain:quotes.workspace.kind.${kind}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        labels={labels}
        exportFileName="angebote"
        onRowClick={(row) => {
          if (row.id) void navigate(routes.quoteWorkspaceDetail(row.id));
        }}
        empty={
          <EmptyState
            title={hasAny ? t('domain:quotes.workspace.noResults') : t('domain:quotes.emptyTitle')}
            description={
              hasAny
                ? t('domain:quotes.workspace.noResultsDescription')
                : t('domain:quotes.emptyDescription')
            }
          />
        }
      />
    </div>
  );
}
