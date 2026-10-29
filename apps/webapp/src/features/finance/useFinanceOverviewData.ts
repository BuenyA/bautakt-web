import { buildIncomingDesk, buildOutgoingDesk } from '@bautakt/finance';
import { useMemo } from 'react';

import { localIsoDate } from '@/features/overview/today';

import { useIncomingInvoiceList } from './useExpenses';
import { useFinanceAccess } from './useFinanceAccess';
import { INVOICE_TYPE_LIST, usePayments, useSalesDocuments } from './useSalesDocuments';

/**
 * Alles für die Rechnungs-Übersicht (`/rechnungen`).
 *
 * Dieselben Abfragen wie die Startseite — der Query-Cache teilt sie, ein
 * Wechsel zwischen beiden Seiten lädt nichts doppelt. Gerechnet wird in
 * `@bautakt/finance`. Jeder Block trägt sein Recht: ohne Recht `null`, nie
 * eine Null, die wie „nichts offen“ aussieht. Die Kennzahlen stehen seit
 * 17.10.2026 in den Auswertungen (`useFinanceNumbers`).
 */
export function useFinanceOverviewData() {
  const access = useFinanceAccess();
  const todayIso = localIsoDate(new Date());

  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const payments = usePayments();
  const incoming = useIncomingInvoiceList();

  const outgoing = useMemo(
    () => buildOutgoingDesk(documents.data ?? [], payments.data ?? [], todayIso),
    [documents.data, payments.data, todayIso],
  );

  const incomingDesk = useMemo(
    () => buildIncomingDesk(incoming.data ?? [], todayIso),
    [incoming.data, todayIso],
  );

  // Kundennamen hängen an der Listenzeile, nicht am Rechenmodell.
  const customerById = useMemo(
    () => new Map((documents.data ?? []).map((row) => [row.id, row.customer_label])),
    [documents.data],
  );

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
  };
}

export type FinanceOverviewData = ReturnType<typeof useFinanceOverviewData>;
