import { DataTable, type DataTableColumn } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';

import { type CostCenterRow, useCostCenters } from '../useMasterData';

export function CostCentersPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const costCenters = useCostCenters();
  const { data } = costCenters;

  const isLoading = useCompanyListLoading(costCenters);

  const columns = useMemo<DataTableColumn<CostCenterRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('domain:costCenters.columns.code'),
        cell: ({ row }) => (
          <span className="text-foreground font-medium tabular-nums">{row.original.code}</span>
        ),
      },
      { accessorKey: 'name', header: t('domain:costCenters.columns.name') },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:costCenters.title')}
        description={t('domain:costCenters.description')}
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="kostenstellen"
        empty={
          <EmptyState
            title={t('domain:costCenters.emptyTitle')}
            description={t('domain:costCenters.emptyDescription')}
          />
        }
      />
    </div>
  );
}
