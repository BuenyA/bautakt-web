import {
  buildIncomingDesk,
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
 * Kennzahlen oben in den Auswertungen: Umsatz Monat und Jahr, Ergebnis,
 * offene Forderungen und offene Eingangsrechnungen.
 *
 * Dieselben Abfragen wie Startseite und Übersicht — der Query-Cache teilt sie.
 * Gerechnet wird in `@bautakt/finance`. Ohne Recht `null`, nie eine Null, die
 * wie „nichts offen“ aussieht.
 */
export function useFinanceNumbers() {
  const access = useFinanceAccess();
  const canViewWageCosts = usePermission('canViewWageCosts');
  const todayIso = localIsoDate(new Date());
  const month = todayIso.slice(0, 7);

  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const payments = usePayments();
  const expenses = useExpenses();
  const incoming = useIncomingInvoiceList();
  const labor = useLaborInputs(access.canViewCompanyFinance && canViewWageCosts);

  const numbers = useMemo(() => {
    const docs = documents.data ?? [];
    const incomingRows = incoming.data ?? [];
    const receivables = buildReceivables(docs, payments.data ?? [], todayIso);
    const incomingDesk = buildIncomingDesk(
      incomingRows,
      todayIso,
      newSince(parseLocalIso(todayIso)).toISOString(),
    );

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
    month,
    todayIso,
  ]);

  if (!access.canViewCompanyFinance) return null;
  return {
    ...numbers,
    laborIncluded: canViewWageCosts,
    isLoading:
      documents.isPending ||
      payments.isPending ||
      expenses.isPending ||
      incoming.isPending ||
      (canViewWageCosts && labor.isPending),
    isError: documents.isError || payments.isError || expenses.isError || incoming.isError,
  };
}

export type FinanceNumbers = NonNullable<ReturnType<typeof useFinanceNumbers>>;
