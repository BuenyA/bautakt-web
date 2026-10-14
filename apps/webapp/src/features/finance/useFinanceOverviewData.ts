import {
  buildIncomingDesk,
  buildOutgoingDesk,
  buildReceivables,
  computeYearResult,
  netRevenueMonth,
  totalOpenMinor,
  totalOverdueMinor,
} from '@bautakt/finance';
import { useMemo } from 'react';

import { usePermission } from '@/features/company/usePermission';
import { localIsoDate, newSince, parseLocalIso } from '@/features/overview/today';
import { useLaborInputs } from '@/features/overview/useTodayData';

import { useExpenses, useIncomingInvoiceList } from './useExpenses';
import { useFinanceAccess } from './useFinanceAccess';
import { INVOICE_TYPE_LIST, usePayments, useSalesDocuments } from './useSalesDocuments';

/**
 * Alles für die Rechnungs-Übersicht (`/rechnungen`).
 *
 * Dieselben Abfragen wie die Startseite — der Query-Cache teilt sie, ein
 * Wechsel zwischen beiden Seiten lädt nichts doppelt. Gerechnet wird in
 * `@bautakt/finance`. Jeder Block trägt sein Recht: ohne Recht `null`, nie
 * eine Null, die wie „nichts offen“ aussieht.
 */
export function useFinanceOverviewData() {
  const access = useFinanceAccess();
  const canViewWageCosts = usePermission('canViewWageCosts');
  const todayIso = localIsoDate(new Date());
  const month = todayIso.slice(0, 7);

  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const payments = usePayments();
  const expenses = useExpenses();
  const incoming = useIncomingInvoiceList();
  const labor = useLaborInputs(access.canViewCompanyFinance && canViewWageCosts);

  const outgoing = useMemo(
    () => buildOutgoingDesk(documents.data ?? [], payments.data ?? [], todayIso),
    [documents.data, payments.data, todayIso],
  );

  const incomingDesk = useMemo(
    () =>
      buildIncomingDesk(
        incoming.data ?? [],
        todayIso,
        newSince(parseLocalIso(todayIso)).toISOString(),
      ),
    [incoming.data, todayIso],
  );

  // Kundennamen hängen an der Listenzeile, nicht am Rechenmodell.
  const customerById = useMemo(
    () => new Map((documents.data ?? []).map((row) => [row.id, row.customer_label])),
    [documents.data],
  );

  const numbers = useMemo(() => {
    const docs = documents.data ?? [];
    const incomingRows = incoming.data ?? [];
    const receivables = buildReceivables(docs, payments.data ?? [], todayIso);

    return {
      month: netRevenueMonth(docs, month),
      year: computeYearResult({
        documents: docs,
        expenses: expenses.data ?? [],
        incoming: incomingRows,
        labor: canViewWageCosts && labor.data ? labor.data : null,
        referenceIso: todayIso,
      }),
      receivablesMinor: totalOpenMinor(receivables),
      overdueMinor: totalOverdueMinor(receivables),
      payablesMinor: incomingDesk.open.minor,
    };
  }, [
    documents.data,
    payments.data,
    expenses.data,
    incoming.data,
    labor.data,
    canViewWageCosts,
    incomingDesk.open.minor,
    month,
    todayIso,
  ]);

  return {
    access,
    outgoing: access.canReadSalesDocuments
      ? {
          desk: outgoing,
          customerById,
          isLoading: documents.isPending || payments.isPending,
          isError: documents.isError || payments.isError,
        }
      : null,
    incoming: access.canViewExpenses
      ? { desk: incomingDesk, isLoading: incoming.isPending, isError: incoming.isError }
      : null,
    numbers: access.canViewCompanyFinance
      ? {
          ...numbers,
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

export type FinanceOverviewData = ReturnType<typeof useFinanceOverviewData>;
