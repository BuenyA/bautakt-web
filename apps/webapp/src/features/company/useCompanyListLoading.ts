import { useMembership } from './useMembership';

type PendingQuery = { isPending: boolean };

/**
 * Laedt die Liste noch?
 *
 * ⚠️ Nicht `isLoading` der Abfrage benutzen. Alle Listen-Abfragen haengen an
 * `companyId` und sind `enabled: false`, solange die Mitgliedschaft laedt. Eine
 * abgeschaltete Abfrage meldet in TanStack Query v5 `isPending: true`, aber
 * `isFetching: false` — und damit `isLoading: false`. Die Liste haelt sich dann
 * fuer fertig und zeigt „Nichts vorhanden", bevor sie ueberhaupt gefragt hat.
 * Sichtbar war das als kurzes Aufblitzen des Leerzustands bei jedem Seitenaufruf;
 * auf einer langsamen Verbindung steht es sekundenlang da.
 *
 * Deshalb hier: waehrend die Mitgliedschaft laedt, laedt auch die Liste. Gibt es
 * keine Mitgliedschaft, laedt nichts mehr — dann ist der Leerzustand richtig.
 */
export function useCompanyListLoading(...queries: PendingQuery[]): boolean {
  const { data: membership, isPending: membershipPending } = useMembership();

  if (membershipPending) return true;
  if (!membership?.companyId) return false;
  return queries.some((query) => query.isPending);
}
