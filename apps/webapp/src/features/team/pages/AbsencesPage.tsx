import { daysBetween } from '@bautakt/finance';
import { DataTable, type DataTableColumn, StatusBadge, type StatusTone, toast } from '@bautakt/ui';
import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tab,
  TabList,
} from '@fluentui/react-components';
import {
  AddRegular,
  CheckmarkRegular,
  DeleteRegular,
  DismissCircleRegular,
  DismissRegular,
  EditRegular,
  MoreHorizontalRegular,
} from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useCreateFromUrl } from '@/components/common/useCreateFromUrl';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';

import {
  type AbsenceAction,
  AbsenceActionDialog,
  type AbsenceTarget,
} from '../AbsenceActionDialog';
import { AbsenceSheet } from '../AbsenceSheet';
import { ABSENCE_TYPES, PENDING_STATUS } from '../absenceValues';
import { type AbsenceRow, useAbsences, useApproveAbsence } from '../useAbsences';

function statusTone(status: string): StatusTone {
  switch (status) {
    case 'genehmigt':
      return 'success';
    case 'abgelehnt':
      return 'danger';
    case 'ausstehend':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function AbsencesPage() {
  const { t } = useTranslation();
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
  // Am Handy ist die Tabelle zu schmal für zwei Knöpfe: dort stehen Genehmigen
  // und Ablehnen oben im Menü.
  const compact = useMediaQuery('(max-width: 639px)');
  const [editing, setEditing] = useState<AbsenceRow | null>(null);
  const [pending, setPending] = useState<{ action: AbsenceAction; absence: AbsenceTarget } | null>(
    null,
  );
  const ask = useCallback(
    (action: AbsenceAction, row: AbsenceRow) =>
      setPending({
        action,
        absence: {
          id: row.id,
          name: row.employee_name,
          type: row.type,
          startDate: row.start_date,
          endDate: row.end_date,
        },
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
          (ABSENCE_TYPES as readonly string[]).includes(row.original.type)
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
          <span className="flex flex-col items-start gap-0.5">
            <StatusBadge tone={statusTone(row.original.status)}>
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
        cell: ({ row }) => {
          if (!canManage) return null;
          const absence = row.original;
          const isPending = absence.status === PENDING_STATUS;
          const editable = isPending || absence.status === 'genehmigt';
          return (
            <span className="flex items-center justify-end gap-2">
              {isPending && !compact ? (
                <>
                  <Button disabled={approve.isPending} onClick={() => void onApprove(absence)}>
                    {t('domain:absences.approve')}
                  </Button>
                  <Button onClick={() => ask('reject', absence)}>
                    {t('domain:absences.reject')}
                  </Button>
                </>
              ) : null}
              <Menu positioning="below-end">
                <MenuTrigger disableButtonEnhancement>
                  <Button
                    appearance="subtle"
                    icon={<MoreHorizontalRegular />}
                    aria-label={t('domain:absences.moreActions', {
                      name: absence.employee_name || t('domain:employees.unnamed'),
                    })}
                  />
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {isPending && compact ? (
                      <>
                        <MenuItem
                          icon={<CheckmarkRegular />}
                          disabled={approve.isPending}
                          onClick={() => void onApprove(absence)}
                        >
                          {t('domain:absences.approve')}
                        </MenuItem>
                        <MenuItem icon={<DismissRegular />} onClick={() => ask('reject', absence)}>
                          {t('domain:absences.reject')}
                        </MenuItem>
                      </>
                    ) : null}
                    {editable ? (
                      <MenuItem icon={<EditRegular />} onClick={() => setEditing(absence)}>
                        {t('domain:absences.edit')}
                      </MenuItem>
                    ) : null}
                    {absence.status === 'genehmigt' ? (
                      <MenuItem
                        icon={<DismissCircleRegular />}
                        onClick={() => ask('cancel', absence)}
                      >
                        {t('domain:absences.cancelAction')}
                      </MenuItem>
                    ) : null}
                    <MenuItem icon={<DeleteRegular />} onClick={() => ask('delete', absence)}>
                      {t('domain:absences.delete')}
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            </span>
          );
        },
      },
    ],
    [t, canManage, approve.isPending, onApprove, ask, compact],
  );

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
      <AbsenceSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        absence={editing ?? undefined}
      />
      <AbsenceActionDialog
        action={pending?.action ?? null}
        absence={pending?.absence ?? null}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
