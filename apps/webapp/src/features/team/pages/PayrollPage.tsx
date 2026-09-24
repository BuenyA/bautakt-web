import { eurosToMinor, formatMoney } from '@bautakt/finance';
import { Badge, DataTable, type DataTableColumn } from '@bautakt/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { employmentDisplayName } from '@/lib/employeeName';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type RateRow = {
  id: string;
  scope: string;
  role_name: string | null;
  valid_from: string;
  valid_to: string | null;
  billing_rate: number;
  cost_rate: number;
  employee_name: string;
};

/**
 * Stundensaetze: was der Betrieb berechnet und was ihn die Stunde kostet.
 *
 * `scope` unterscheidet firmenweite Saetze von solchen fuer eine Rolle, eine
 * Person oder einen Auftrag. Der Kostensatz ist die empfindlichere Zahl —
 * `canViewWageCosts` entscheidet, ob die Spalte ueberhaupt erscheint.
 */
function useLaborRates() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['labor-rates', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<RateRow[]> => {
      const { data, error } = await supabase
        .from('labor_rates')
        .select(
          'id, scope, role_name, valid_from, valid_to, billing_rate, cost_rate, employments(display_first_name, display_last_name, profiles(first_name, last_name))',
        )
        .eq('company_id', companyId!)
        .order('valid_from', { ascending: false });

      if (error) throw error;

      return (
        (data ?? []) as unknown as (Omit<RateRow, 'employee_name'> & {
          employments: {
            display_first_name: string | null;
            display_last_name: string | null;
            profiles: { first_name: string | null; last_name: string | null } | null;
          } | null;
        })[]
      ).map(({ employments, ...row }) => ({
        ...row,
        employee_name: employments ? employmentDisplayName(employments) : '',
      }));
    },
  });
}

export function PayrollPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const canViewCosts = usePermission('canViewWageCosts');
  const { data, isLoading } = useLaborRates();

  const columns = useMemo<DataTableColumn<RateRow>[]>(() => {
    const base: DataTableColumn<RateRow>[] = [
      {
        id: 'target',
        accessorFn: (row) => row.employee_name || row.role_name || '',
        header: t('domain:payroll.columns.target'),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="text-foreground font-medium">
              {row.original.employee_name ||
                row.original.role_name ||
                t('domain:payroll.companyWide')}
            </span>
            <Badge variant="muted">
              {t(`domain:payroll.scopes.${row.original.scope}`, {
                defaultValue: row.original.scope,
              })}
            </Badge>
          </span>
        ),
      },
      {
        accessorKey: 'valid_from',
        header: t('domain:payroll.columns.validFrom'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.valid_from)}
            {row.original.valid_to ? ` – ${formatDate(row.original.valid_to)}` : ''}
          </span>
        ),
      },
      {
        accessorKey: 'billing_rate',
        header: t('domain:payroll.columns.billing'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(eurosToMinor(row.original.billing_rate))}
          </span>
        ),
      },
    ];

    if (canViewCosts) {
      base.push({
        accessorKey: 'cost_rate',
        header: t('domain:payroll.columns.cost'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right tabular-nums">
            {formatMoney(eurosToMinor(row.original.cost_rate))}
          </span>
        ),
      });
    }

    return base;
  }, [t, canViewCosts]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('domain:payroll.title')} description={t('domain:payroll.description')} />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="stundensaetze"
        empty={
          <EmptyState
            title={t('domain:payroll.emptyTitle')}
            description={t('domain:payroll.emptyDescription')}
          />
        }
      />
    </div>
  );
}
