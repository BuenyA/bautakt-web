/**
 * Stundensatz zum Zeitpunkt eines Zeiteintrags.
 *
 * Spiegelt `resolve_labor_rate` (gemessen 2026-10-08): gültig ist ein Satz mit
 * `valid_from <= Tag` und `valid_to` leer oder später als der Tag. Die Kaskade
 * ist Auftrag, dann Anstellung, dann Rolle, dann Betrieb. Bei mehreren
 * Treffern derselben Stufe gewinnt das jüngste `valid_from`. Trifft nichts,
 * sind beide Sätze 0 — die Funktion in der Datenbank macht dasselbe mit
 * `coalesce`.
 *
 * Der Client ruft die Funktion nicht auf. Sie ist `SECURITY DEFINER` und für
 * `authenticated` nicht ausführbar; ein Grant ohne Mitgliedschaftsprüfung wäre
 * das alte mandantenübergreifende Leck. Lesen läuft über `labor_rates` und
 * damit über RLS.
 */
export type LaborRateCandidate = {
  scope: string;
  orderId: string | null;
  employmentId: string | null;
  roleName: string | null;
  validFrom: string;
  validTo: string | null;
  costRate: number;
  billingRate: number;
};

export type LaborRateSnapshot = {
  costRate: number;
  billingRate: number;
};

const EMPTY_SNAPSHOT: LaborRateSnapshot = { costRate: 0, billingRate: 0 };

export function resolveLaborRate(
  rates: LaborRateCandidate[],
  input: {
    orderId: string;
    employmentId: string;
    roleName: string | null;
    onDate: string;
  },
): LaborRateSnapshot {
  const ranked: { rang: number; validFrom: string; snapshot: LaborRateSnapshot }[] = [];

  for (const rate of rates) {
    if (rate.validFrom > input.onDate) continue;
    if (rate.validTo != null && rate.validTo <= input.onDate) continue;

    let rang: number | null = null;
    if (input.orderId && rate.scope === 'order' && rate.orderId === input.orderId) rang = 1;
    else if (
      input.employmentId &&
      rate.scope === 'employment' &&
      rate.employmentId === input.employmentId
    ) {
      rang = 2;
    } else if (input.roleName && rate.scope === 'role' && rate.roleName === input.roleName) {
      rang = 3;
    } else if (rate.scope === 'company') rang = 4;

    if (rang == null) continue;
    ranked.push({
      rang,
      validFrom: rate.validFrom,
      snapshot: { costRate: rate.costRate, billingRate: rate.billingRate },
    });
  }

  ranked.sort((a, b) => a.rang - b.rang || b.validFrom.localeCompare(a.validFrom));
  return ranked[0]?.snapshot ?? EMPTY_SNAPSHOT;
}
