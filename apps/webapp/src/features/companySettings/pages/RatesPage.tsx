import { eurosToMinor, formatMoney, formatMoneyInput, parseMoneyInput } from '@bautakt/finance';
import { DataTable, type DataTableColumn, SkeletonBlock, StatusBadge, toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components';
import { Edit20Regular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { SubPage } from '@/components/layout/SubNavLayout';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { employmentDisplayName } from '@/lib/employeeName';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';

import { useCompanyAccess } from '../companyAccess';
import { SectionGuard } from '../SectionGuard';
import { useCompanyRoles } from '../useCompanyRoles';

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

/** Ziel einer Änderung: der Firmenstandard oder eine Rolle. */
type Target = { scope: 'company' } | { scope: 'role'; roleName: string };

/**
 * Satz ändern über `set_company_labor_rate` / `set_role_labor_rate`. Die RPCs
 * schließen den laufenden Satz zum heutigen Tag ab und legen einen neuen an —
 * vergangene Zeiten behalten ihren Satz.
 */
function useSetRate() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useMutation({
    mutationFn: async ({
      target,
      cost,
      billing,
    }: {
      target: Target;
      cost: number;
      billing: number;
    }) => {
      const { error } =
        target.scope === 'company'
          ? await supabase.rpc('set_company_labor_rate', {
              p_company_id: companyId!,
              p_cost: cost,
              p_billing: billing,
            })
          : await supabase.rpc('set_role_labor_rate', {
              p_company_id: companyId!,
              p_role_name: target.roleName,
              p_cost: cost,
              p_billing: billing,
            });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labor-rates', companyId] }),
  });
}

function RateDialog({
  target,
  label,
  current,
  onClose,
}: {
  target: Target;
  label: string;
  current: RateRow | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const setRate = useSetRate();
  const [cost, setCost] = useState(formatMoneyInput(current?.cost_rate));
  const [billing, setBilling] = useState(formatMoneyInput(current?.billing_rate));
  const [submitted, setSubmitted] = useState(false);
  const costMinor = parseMoneyInput(cost);
  const billingMinor = parseMoneyInput(billing);
  const costError =
    submitted && !(costMinor && costMinor > 0) ? t('companySettings:rates.positive') : undefined;
  const billingError =
    submitted && !(billingMinor && billingMinor > 0)
      ? t('companySettings:rates.positive')
      : undefined;

  async function submit() {
    setSubmitted(true);
    if (!(costMinor && costMinor > 0 && billingMinor && billingMinor > 0)) return;
    try {
      await setRate.mutateAsync({ target, cost: costMinor / 100, billing: billingMinor / 100 });
      toast.success(t('companySettings:rates.saved'));
      onClose();
    } catch (caught) {
      toast.error(t('domain:settings.saveError'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  }

  return (
    <Dialog open onOpenChange={(_, data) => !data.open && !setRate.isPending && onClose()}>
      <DialogSurface>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogBody>
            <DialogTitle>{t('companySettings:rates.editTitle', { target: label })}</DialogTitle>
            <DialogContent className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">{t('companySettings:rates.editHint')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t('domain:payroll.columns.cost')}
                  required
                  validationMessage={costError}
                >
                  <Input
                    value={cost}
                    inputMode="decimal"
                    contentAfter={t('companySettings:rates.perHour')}
                    onChange={(_, d) => setCost(d.value)}
                  />
                </Field>
                <Field
                  label={t('domain:payroll.columns.billing')}
                  required
                  validationMessage={billingError}
                >
                  <Input
                    value={billing}
                    inputMode="decimal"
                    contentAfter={t('companySettings:rates.perHour')}
                    onChange={(_, d) => setBilling(d.value)}
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" disabled={setRate.isPending} onClick={onClose}>
                {t('common:action.cancel')}
              </Button>
              <Button
                appearance="primary"
                type="submit"
                disabled={setRate.isPending}
                icon={setRate.isPending ? <Spinner size="tiny" /> : undefined}
              >
                {t('common:action.save')}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}

/** Die laufenden Sätze für Betrieb und Rollen — das, was neue Zeiten bekommen. */
function CurrentRatesCard({
  rates,
  canEdit,
  viewCosts,
}: {
  rates: RateRow[];
  canEdit: boolean;
  viewCosts: boolean;
}) {
  const { t } = useTranslation();
  const roles = useCompanyRoles();
  const [editing, setEditing] = useState<{ target: Target; label: string } | null>(null);
  const currentFor = (scope: string, roleName: string | null) =>
    rates.find((row) => row.scope === scope && row.role_name === roleName && !row.valid_to);

  const rows: { key: string; label: string; target: Target; current: RateRow | undefined }[] = [
    {
      key: 'company',
      label: t('domain:payroll.companyWide'),
      target: { scope: 'company' },
      current: currentFor('company', null),
    },
    ...(roles.data ?? []).map((role) => ({
      key: role.id,
      label: role.name,
      target: { scope: 'role' as const, roleName: role.name },
      current: currentFor('role', role.name),
    })),
  ];
  const money = (value: number | undefined) =>
    value == null ? t('common:state.emptyValue') : formatMoney(eurosToMinor(value));

  return (
    <SectionCard
      title={t('companySettings:rates.current')}
      description={t('companySettings:rates.currentHint')}
    >
      <div className="overflow-x-auto">
        <Table size="small" aria-label={t('companySettings:rates.current')}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t('domain:payroll.columns.target')}</TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('domain:payroll.columns.billing')}
              </TableHeaderCell>
              {viewCosts ? (
                <TableHeaderCell className="text-right">
                  {t('domain:payroll.columns.cost')}
                </TableHeaderCell>
              ) : null}
              <TableHeaderCell>{t('domain:payroll.columns.validFrom')}</TableHeaderCell>
              {canEdit ? <TableHeaderCell aria-label={t('common:action.edit')} /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{row.label}</span>
                    {row.target.scope === 'role' && !row.current ? (
                      <StatusBadge tone="outline">
                        {t('companySettings:rates.inherits')}
                      </StatusBadge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(row.current?.billing_rate)}
                </TableCell>
                {viewCosts ? (
                  <TableCell className="text-right tabular-nums">
                    {money(row.current?.cost_rate)}
                  </TableCell>
                ) : null}
                <TableCell>
                  {row.current ? formatDate(row.current.valid_from) : t('common:state.emptyValue')}
                </TableCell>
                {canEdit ? (
                  <TableCell>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Edit20Regular />}
                      aria-label={t('companySettings:rates.editTitle', { target: row.label })}
                      onClick={() => setEditing({ target: row.target, label: row.label })}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing ? (
        <RateDialog
          target={editing.target}
          label={editing.label}
          current={
            editing.target.scope === 'company'
              ? currentFor('company', null)
              : currentFor('role', editing.target.roleName)
          }
          onClose={() => setEditing(null)}
        />
      ) : null}
    </SectionCard>
  );
}

/**
 * Stundensätze: oben die laufenden Sätze für Betrieb und Rollen (bearbeitbar
 * mit `canManageRates`), darunter der Verlauf aller Sätze — auch der für
 * einzelne Personen und Aufträge.
 *
 * Bis 2026-10-30 lag die Liste als „Lohn“ unter `/lohn` (Owner-Vorgabe vom
 * 2026-10-11: gehört zu den Unternehmenseinstellungen).
 */
export function RatesPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const access = useCompanyAccess();
  const canViewCosts = access.rates.viewCosts;
  const rates = useLaborRates();
  const { data } = rates;

  const isLoading = useCompanyListLoading(rates);

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
            <StatusBadge tone="neutral">
              {t(`domain:payroll.scopes.${row.original.scope}`, {
                defaultValue: row.original.scope,
              })}
            </StatusBadge>
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
    <SectionGuard allowed={access.rates.view}>
      <SubPage
        title={t('companySettings:rates.title')}
        description={t('companySettings:rates.description')}
        wide
      >
        <div className="max-w-3xl">
          {data ? (
            <CurrentRatesCard rates={data} canEdit={access.rates.edit} viewCosts={canViewCosts} />
          ) : (
            <SkeletonBlock className="h-48 w-full" />
          )}
        </div>

        <h2 className="text-foreground pt-2 text-base font-semibold">
          {t('companySettings:rates.history')}
        </h2>
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
      </SubPage>
    </SectionGuard>
  );
}
