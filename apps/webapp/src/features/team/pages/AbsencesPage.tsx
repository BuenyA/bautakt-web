import { daysBetween } from '@bautakt/finance';
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
  Uicon,
} from '@bautakt/ui';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDate } from '@/lib/format';

import { AbsenceSheet } from '../AbsenceSheet';
import { type AbsenceRow, useAbsences, useApproveAbsence } from '../useAbsences';

const KNOWN_TYPES = ['vacation', 'sick', 'special', 'unpaid', 'training'] as const;

function statusVariant(status: string) {
  switch (status) {
    case 'approved':
      return 'success' as const;
    case 'rejected':
      return 'destructive' as const;
    case 'pending':
      return 'warning' as const;
    default:
      return 'muted' as const;
  }
}

export function AbsencesPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const canManage = usePermission('canManageAbsences');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('status') === 'offen' ? 'pending' : 'all';

  const [sheetOpen, setSheetOpen] = useState(false);
  const absences = useAbsences();
  const { data } = absences;
  const approve = useApproveAbsence();

  const rows = useMemo(
    () =>
      filter === 'pending' ? (data ?? []).filter((row) => row.status === 'pending') : (data ?? []),
    [data, filter],
  );

  // Stabile Referenz, damit die Spaltendefinition unten nicht bei jedem Render
  // neu entsteht (und die Tabelle sich neu aufbaut).
  const onApprove = useCallback(
    async (absence: AbsenceRow) => {
      try {
        await approve.mutateAsync(absence.id);
        toast.success(t('domain:absences.approved'));
      } catch (error) {
        toast.error(t('domain:absences.approveError'), {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [approve, t],
  );

  const isLoading = useCompanyListLoading(absences);

  const columns = useMemo<DataTableColumn<AbsenceRow>[]>(
    () => [
      {
        accessorKey: 'employee_name',
        header: t('domain:absences.columns.employee'),
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.employee_name || t('domain:employees.unnamed')}
          </span>
        ),
      },
      {
        accessorKey: 'type',
        header: t('domain:absences.columns.type'),
        cell: ({ row }) =>
          (KNOWN_TYPES as readonly string[]).includes(row.original.type)
            ? t(`domain:absences.types.${row.original.type}`)
            : row.original.type,
      },
      {
        accessorKey: 'start_date',
        header: t('domain:absences.columns.period'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.start_date)} – {formatDate(row.original.end_date)}
          </span>
        ),
      },
      {
        id: 'days',
        // Kalendertage einschliesslich beider Enden — die Feiertags- und
        // Wochenendregeln liegen in der Mobile-App und bleiben dort, bis sie
        // geteilt sind. Hier steht deshalb bewusst „Kalendertage".
        accessorFn: (row) => daysBetween(row.start_date, row.end_date) + 1,
        header: t('domain:absences.columns.days'),
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {daysBetween(row.original.start_date, row.original.end_date) + 1}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('domain:absences.columns.status'),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {t(`domain:absences.status.${row.original.status}`, {
              defaultValue: row.original.status,
            })}
          </Badge>
        ),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) =>
          canManage && row.original.status === 'pending' ? (
            <span className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={approve.isPending}
                onClick={() => void onApprove(row.original)}
              >
                {t('domain:absences.approve')}
              </Button>
            </span>
          ) : null,
      },
    ],
    [t, canManage, approve.isPending, onApprove],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:absences.title')}
        description={t('domain:absences.description')}
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Uicon name="plus" size={16} />
              {t('domain:absenceForm.title')}
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        labels={labels}
        exportFileName="abwesenheiten"
        toolbar={
          <Tabs
            value={filter}
            onValueChange={(next) =>
              setSearchParams(next === 'pending' ? { status: 'offen' } : {}, { replace: true })
            }
          >
            <TabsList>
              <TabsTrigger value="all">{t('domain:absences.filterAll')}</TabsTrigger>
              <TabsTrigger value="pending">{t('domain:absences.filterPending')}</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        empty={
          <EmptyState
            title={t('domain:absences.emptyTitle')}
            description={t('domain:absences.emptyDescription')}
          />
        }
      />

      <AbsenceSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
