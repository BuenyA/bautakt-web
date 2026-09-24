/**
 * Datumshelfer der Finanzseiten.
 *
 * ⚠️ Portiert aus `bautakt-app/app/lib/finance/dates.ts` (Stand 2026-09-23);
 * die Mobile-App bleibt kanonisch.
 *
 * ⚠️ Alle Datumsfelder der Finanzseiten sind reine Kalendertage (`YYYY-MM-DD`,
 * DB-Spaltentyp `date`) — Rechnungsdatum, Faelligkeit, Anschaffungsdatum. Ein
 * Kalendertag hat keine Uhrzeit und damit keine Zeitzone. `toISOString()`
 * erzwingt aber eine: es rechnet nach UTC um. Fuer eine lokale Mitternacht in
 * Deutschland (UTC+1/+2) landet man damit ganzjaehrig im **Vortag**:
 *
 *   new Date(2026, 8, 1)   // 01.09.2026, 00:00 MESZ
 *     .toISOString()       // '2026-08-31T22:00:00.000Z'
 *     .slice(0, 10)        // '2026-08-31'  ← falscher Tag
 *
 * In der Mobile-App war genau das ein ganzjaehrig aktiver Fehler in fuenf
 * Formularen mit durchweg steuerrelevanten Feldern (AfA-Beginn, Vorsteuerabzug,
 * Mahnfristen). Deshalb hier ausschliesslich `toIsoDate` benutzen, nie
 * `toISOString()`.
 */

/** ISO-Kalendertag (`YYYY-MM-DD`) als `TT.MM.JJJJ`. Leer bei Unvollstaendigem. */
export function formatIsoDateDe(iso: string | undefined | null): string {
  if (!iso || iso.length < 10) return '';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

/** ISO-Kalendertag als lokales `Date`. Faellt auf „heute" zurueck. */
export function parseIsoDate(iso: string | undefined | null): Date {
  if (!iso || iso.length < 10) return new Date();
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Gegenstueck zu `parseIsoDate`: lokales `Date` als ISO-Kalendertag. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Heutiger Kalendertag — der Vorgabewert vieler Formularfelder. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Volle Tage zwischen zwei Kalendertagen; negativ, wenn `to` frueher liegt. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  // Auf Mittag normieren, damit die Sommerzeitumstellung (23- und 25-Stunden-
  // Tage) das Ergebnis nicht um einen Tag verschiebt.
  from.setHours(12, 0, 0, 0);
  to.setHours(12, 0, 0, 0);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** Tage, die ein Beleg mit dieser Faelligkeit ueberfaellig ist (0 = nicht). */
export function daysOverdue(dueIso: string | null | undefined, referenceIso = todayIso()): number {
  if (!dueIso) return 0;
  return Math.max(0, daysBetween(dueIso, referenceIso));
}
