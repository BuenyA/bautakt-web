import { daysBetween } from '@bautakt/finance';
import { DataTable, type DataTableColumn, StatusBadge, toast } from '@bautakt/ui';
import { Button, Tab, TabList } from '@fluentui/react-components';
import { AddRegular, CheckmarkRegular, DismissRegular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useCreateFromUrl } from '@/components/common/useCreateFromUrl';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { AbsenceActionDialog, type AbsenceTarget } from '../AbsenceActionDialog';
import { AbsenceSheet } from '../AbsenceSheet';
import { ABSENCE_TYPES, absenceStatusTone, PENDING_STATUS } from '../absenceValues';
import { type AbsenceRow, useAbsences, useApproveAbsence } from '../useAbsences';

export function AbsencesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const labels = useDataTableLabels();
  const canManage = usePermission('canManageAbsences');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('status') === 'offen' ? 'pending' : 'all';

  const [sheetOpen, setSheetOpen] = useState(false);
  // `?neu=1` aus der Schnellsuche öffnet das Anlege-Panel.
  useCreateFromUrl(canManage, () => setSheetOpen(true));
  const absences = useAbsences();
  const { data } = absences;
  const approve = useApproveAbsence();
  // Am Handy ist die Tabelle zu schmal für alle Spalten: dort fallen
  // Kalendertage und Knöpfe weg. Beides steht auf der Detailseite.
  const compact = useMediaQuery('(max-width: 639px)');
  const [rejecting, setRejecting] = useState<AbsenceTarget | null>(null);
  const askReject = useCallback(
    (row: AbsenceRow) =>
      setRejecting({
        id: row.id,
        name: row.employee_name,
        type: row.type,
        startDate: row.start_date,
        endDate: row.end_date,
      }),
    [],
  );

  const rows = useMemo(
    () =>
      filter === 'pending'
        ? (data ?? []).filter((row) => row.status === PENDING_STATUS)
        : (data ?? []),
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
          description: readableDbError(error) ?? undefined,
        });
      }
    },
    [approve, t],
  );

  const isLoading = useCompanyListLoading(absences);

  const columns = useMemo<DataTableColumn<AbsenceRow>[]>(() => {
    const all: DataTableColumn<AbsenceRow>[] = [
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
        cell: ({ row }) => (
          <span className="hyphens-auto">
            {(ABSENCE_TYPES as readonly string[]).includes(row.original.type)
              ? t(`domain:absences.types.${row.original.type}`)
              : row.original.type}
          </span>
        ),
      },
      {
        accessorKey: 'start_date',
        header: t('domain:absences.columns.period'),
        cell: ({ row }) => (
          // Am Handy bricht der Zeitraum zwischen den beiden Daten um, nie mitten im Datum.
          <span className="text-muted-foreground sm:whitespace-nowrap">
            <span className="whitespace-nowrap">{formatDate(row.original.start_date)}</span>{' '}
            <span className="whitespace-nowrap">bis {formatDate(row.original.end_date)}</span>
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
          <span className="flex flex-col items-start gap-0.5">
            <StatusBadge tone={absenceStatusTone(row.original.status)}>
              {t(`domain:absences.status.${row.original.status}`, {
                defaultValue: row.original.status,
              })}
            </StatusBadge>
            {row.original.status === 'abgelehnt' && row.original.decision_note ? (
              <span className="text-muted-foreground max-w-56 text-xs break-words">
                {row.original.decision_note}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        id: 'action',
        header: '',
        // Nur Symbole, wie in der Übersicht; alles Weitere auf der Detailseite.
        // `stopPropagation`, sonst öffnet der Klick zusätzlich die Zeile.
        cell: ({ row }) => {
          const absence = row.original;
          if (!canManage || absence.status !== PENDING_STATUS) return null;
          const name = absence.employee_name || t('domain:employees.unnamed');
          return (
            <span className="flex items-center justify-end gap-2">
              <Button
                size="small"
                appearance="primary"
                icon={<CheckmarkRegular />}
                disabled={approve.isPending}
                title={t('domain:absences.approve')}
                aria-label={t('domain:overview.todo.approveA11y', { name })}
                onClick={(event) => {
                  event.stopPropagation();
                  void onApprove(absence);
                }}
              />
              <Button
                size="small"
                icon={<DismissRegular />}
                title={t('domain:absences.reject')}
                aria-label={t('domain:overview.todo.rejectA11y', { name })}
                onClick={(event) => {
                  event.stopPropagation();
                  askReject(absence);
                }}
              />
            </span>
          );
        },
      },
    ];
    return compact ? all.filter((column) => column.id !== 'days' && column.id !== 'action') : all;
  }, [t, canManage, approve.isPending, onApprove, askReject, compact]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:absences.title')}
        description={t('domain:absences.description')}
        actions={
          canManage ? (
            <Button appearance="primary" onClick={() => setSheetOpen(true)} icon={<AddRegular />}>
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
        onRowClick={(absence) => void navigate(routes.absence(absence.id))}
        toolbar={
          <TabList
            selectedValue={filter}
            onTabSelect={(_, { value }) =>
              setSearchParams(value === 'pending' ? { status: 'offen' } : {}, { replace: true })
            }
          >
            <Tab value="all">{t('domain:absences.filterAll')}</Tab>
            <Tab value="pending">{t('domain:absences.filterPending')}</Tab>
          </TabList>
        }
        empty={
          <EmptyState
            title={t('domain:absences.emptyTitle')}
            description={t('domain:absences.emptyDescription')}
          />
        }
      />

      <AbsenceSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <AbsenceActionDialog
        action={rejecting ? 'reject' : null}
        absence={rejecting}
        onClose={() => setRejecting(null)}
      />
    </div>
  );
}
