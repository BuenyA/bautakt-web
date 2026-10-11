import {
  buildReceivables,
  computeOpenTasks,
  computeOverviewKpis,
  computeYearResult,
  monthlyRevenue,
  monthlyTotals,
  monthRange,
  type ReceivableItem,
} from '@bautakt/finance';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { useExpenses, useIncomingInvoiceList } from '@/features/finance/useExpenses';
import { useFinanceAccess } from '@/features/finance/useFinanceAccess';
import {
  INVOICE_TYPE_LIST,
  usePayments,
  useSalesDocuments,
} from '@/features/finance/useSalesDocuments';
import { supabase } from '@/lib/supabase';

import { addDaysIso, collectDeadlines, localIsoDate, newSince, parseLocalIso } from './today';
import {
  useLaborInputs,
  useOrderEndDates,
  useOverviewAbsences,
  useTodayAssignments,
  useTodayEvents,
} from './useTodayData';

/** Belege, zu denen bereits eine Mahnung existiert — die zaehlen nicht mehr als offen. */
export function useDunnedDocumentIds(enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['dunning-notices', companyId],
    enabled: enabled && Boolean(companyId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('dunning_notices')
        .select('document_id')
        .eq('company_id', companyId!);

      if (error) throw error;
      return (data ?? []).map((row) => row.document_id);
    },
  });
}

const SICK_TYPES = new Set(['krankheit', 'kind_krank']);
const DEADLINE_HORIZON_DAYS = 7;

/**
 * Alles, was die Übersicht zeigt.
 *
 * Gerechnet wird in `@bautakt/finance` und `./today`, nicht hier: dieselben
 * Regeln wie in der Handy-App, und prüfbar ohne React. Jeder Abschnitt trägt
 * sein Recht mit — ⚠️ Führung, keine Kontrolle: die Grenze bleibt RLS.
 */
export function useOverviewData() {
  const access = useFinanceAccess();
  const canManageAbsences = usePermission('canManageAbsences');
  const canViewWageCosts = usePermission('canViewWageCosts');
  const canPlan = usePermission('canManageWorkAssignments');
  const finance = access.canViewCompanyFinance;

  const todayIso = localIsoDate(new Date());
  const horizonIso = addDaysIso(todayIso, DEADLINE_HORIZON_DAYS);

  const assignments = useTodayAssignments();
  const events = useTodayEvents();
  const absences = useOverviewAbsences();

  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const payments = usePayments();
  const dunned = useDunnedDocumentIds(finance);
  const expenses = useExpenses();
  const incoming = useIncomingInvoiceList();
  const labor = useLaborInputs(finance && canViewWageCosts);
  const orderEnds = useOrderEndDates(canPlan || finance, horizonIso);

  const absenceView = useMemo(() => {
    const rows = absences.data ?? [];
    return {
      pending: canManageAbsences ? rows.filter((row) => row.status === 'ausstehend') : [],
      // Abwesend ist, wer genehmigt fehlt — und wer sich krank gemeldet hat,
      // auch bevor jemand die Meldung bestätigt.
      today: rows.filter(
        (row) =>
          row.startDate <= todayIso &&
          row.endDate >= todayIso &&
          (row.status === 'genehmigt' || (row.status === 'ausstehend' && SICK_TYPES.has(row.type))),
      ),
    };
  }, [absences.data, canManageAbsences, todayIso]);

  const financeView = useMemo(() => {
    const docs = documents.data ?? [];
    const pays = payments.data ?? [];
    const incomingRows = incoming.data ?? [];
    const month = todayIso.slice(0, 7);
    const months = monthRange(month, Number(month.slice(5, 7)));
    const receivables = buildReceivables(docs, pays, todayIso);

    return {
      kpis: computeOverviewKpis(docs, pays, month, todayIso),
      tasks: computeOpenTasks(docs, pays, incomingRows, new Set(dunned.data ?? [])),
      result: computeYearResult({
        documents: docs,
        expenses: expenses.data ?? [],
        incoming: incomingRows,
        labor: canViewWageCosts && labor.data ? labor.data : null,
        referenceIso: todayIso,
      }),
      revenueByMonth: monthlyRevenue(docs, months),
      expensesByMonth: monthlyTotals(
        [
          ...(expenses.data ?? [])
            .filter((expense) => !expense.is_calculatory)
            .map((expense) => ({ dateIso: expense.invoice_date, amount: expense.amount_net })),
          ...incomingRows.map((invoice) => ({
            dateIso: invoice.invoice_date,
            amount: invoice.net_total,
          })),
        ],
        months,
      ),
      overdue: receivables
        .filter((item) => item.daysOverdue > 0)
        .sort((a, b) => b.daysOverdue - a.daysOverdue),
      upcomingInvoices: receivables.filter((item) => item.daysOverdue === 0),
    };
  }, [
    documents.data,
    payments.data,
    incoming.data,
    dunned.data,
    expenses.data,
    labor.data,
    canViewWageCosts,
    todayIso,
  ]);

  const incomingView = useMemo(() => {
    if (!access.canViewExpenses) return [];
    const since = newSince(parseLocalIso(todayIso)).toISOString();
    return (incoming.data ?? [])
      .filter((invoice) => invoice.status !== 'paid' && invoice.created_at >= since)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [incoming.data, access.canViewExpenses, todayIso]);

  const deadlines = useMemo(
    () =>
      collectDeadlines(
        {
          incoming: access.canViewExpenses ? (incoming.data ?? []) : [],
          invoices: finance
            ? financeView.upcomingInvoices.map((item: ReceivableItem) => ({
                id: item.document.id,
                label: item.document.document_number ?? '',
                due_date: item.document.due_date,
                amount: item.openMinor / 100,
              }))
            : [],
          orders: orderEnds.data ?? [],
        },
        todayIso,
        DEADLINE_HORIZON_DAYS,
      ),
    [
      access.canViewExpenses,
      incoming.data,
      finance,
      financeView.upcomingInvoices,
      orderEnds.data,
      todayIso,
    ],
  );

  return {
    access: { ...access, canManageAbsences, canViewWageCosts, canPlan },
    today: {
      assignments: assignments.data ?? [],
      events: events.data ?? [],
      absences: absenceView.today,
      isLoading: assignments.isPending || events.isPending,
      isError: assignments.isError || events.isError,
    },
    todo: {
      pendingAbsences: absenceView.pending,
      newIncoming: incomingView,
      deadlines,
      overdue: finance ? financeView.overdue : [],
      tasks: finance ? financeView.tasks : null,
      isLoading: absences.isPending || incoming.isPending,
    },
    finance: finance
      ? {
          ...financeView,
          laborIncluded: canViewWageCosts,
          isLoading:
            documents.isPending ||
            payments.isPending ||
            expenses.isPending ||
            incoming.isPending ||
            (canViewWageCosts && labor.isPending),
          isError: documents.isError || payments.isError || expenses.isError || incoming.isError,
        }
      : null,
  };
}

export type OverviewData = ReturnType<typeof useOverviewData>;
