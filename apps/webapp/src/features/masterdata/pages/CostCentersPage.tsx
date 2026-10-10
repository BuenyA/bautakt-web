import { eurosToMinor, formatMoney } from '@bautakt/finance';
import { DangerButton, DataTable, type DataTableColumn, toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { readableDbError } from '@/lib/dbErrors';

import { CostCenterSheet } from '../CostCenterSheet';
import { CostCenterInUseError, useDeleteCostCenter } from '../useCostCenterMutations';
import { type CostCenterRow, useCostCenters } from '../useMasterData';

export function CostCentersPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const costCenters = useCostCenters();
  const { data, isError, refetch } = costCenters;
  const remove = useDeleteCostCenter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState<CostCenterRow | null>(null);
  const [blockedCount, setBlockedCount] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isLoading = useCompanyListLoading(costCenters);

  const askDelete = useCallback((row: CostCenterRow) => {
    setDeleteError(null);
    setPending(row);
    setBlockedCount(row.orderCount > 0 ? row.orderCount : null);
  }, []);

  function closeDelete() {
    if (remove.isPending) return;
    setPending(null);
    setBlockedCount(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!pending || blockedCount !== null) return;

    try {
      await remove.mutateAsync(pending.id);
      toast.success(t('domain:costCenters.delete.deleted'));
      setPending(null);
      setBlockedCount(null);
      setDeleteError(null);
    } catch (caught) {
      if (caught instanceof CostCenterInUseError) {
        setBlockedCount(caught.orderCount);
        setDeleteError(null);
        return;
      }
      setDeleteError(readableDbError(caught) ?? t('domain:costCenters.delete.deleteError'));
    }
  }

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
      {
        accessorKey: 'orderCount',
        header: t('domain:costCenters.columns.orders'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right tabular-nums">
            {row.original.orderCount}
          </span>
        ),
      },
      {
        accessorKey: 'contractSum',
        header: t('domain:costCenters.columns.contractSum'),
        cell: ({ row }) => {
          const sum = row.original.contractSum;
          if (sum === null) {
            return (
              <span
                className="text-muted-foreground block text-right"
                title={t('domain:costCenters.noContractSumHint')}
              >
                {t('domain:costCenters.noContractSum')}
              </span>
            );
          }
          return (
            <span
              className="text-foreground block text-right font-medium tabular-nums"
              title={t('domain:costCenters.contractSumHint')}
            >
              {formatMoney(eurosToMinor(sum))}
            </span>
          );
        },
      },
      {
        id: 'delete',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex justify-end">
            <Button
              appearance="subtle"
              type="button"
              aria-label={t('domain:costCenters.delete.actionLabel', {
                code: row.original.code,
                name: row.original.name,
              })}
              onClick={() => askDelete(row.original)}
              icon={<DeleteRegular />}
            />
          </span>
        ),
      },
    ],
    [askDelete, t],
  );

  const blocked = blockedCount !== null && blockedCount > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:costCenters.title')}
        description={t('domain:costCenters.description')}
        actions={
          <Button
            appearance="primary"
            size="small"
            onClick={() => setSheetOpen(true)}
            icon={<AddRegular />}
          >
            {t('domain:costCenters.form.action')}
          </Button>
        }
      />

      {isError ? (
        <EmptyState
          title={t('domain:costCenters.loadErrorTitle')}
          description={t('domain:costCenters.loadErrorDescription')}
          action={
            <button
              type="button"
              className="text-brand cursor-pointer text-sm font-medium hover:underline"
              onClick={() => void refetch()}
            >
              {t('common:action.retry')}
            </button>
          }
        />
      ) : (
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
      )}

      <CostCenterSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <Dialog open={pending !== null} onOpenChange={(_, { open }) => !open && closeDelete()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {blocked
                ? t('domain:costCenters.delete.blockedTitle')
                : t('domain:costCenters.delete.confirmTitle')}
            </DialogTitle>
            <DialogContent className="flex flex-col gap-3">
              <p>
                {blocked
                  ? t('domain:costCenters.delete.blockedDescription', { count: blockedCount })
                  : t('domain:costCenters.delete.confirmDescription', {
                      code: pending?.code ?? '',
                      name: pending?.name ?? '',
                    })}
              </p>
              {deleteError ? <p className="text-destructive text-sm">{deleteError}</p> : null}
            </DialogContent>
            <DialogActions>
              <Button type="button" onClick={closeDelete} disabled={remove.isPending}>
                {t('common:action.cancel')}
              </Button>
              {blocked ? null : (
                <DangerButton
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => void confirmDelete()}
                >
                  {t('domain:costCenters.delete.confirmAction')}
                </DangerButton>
              )}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
