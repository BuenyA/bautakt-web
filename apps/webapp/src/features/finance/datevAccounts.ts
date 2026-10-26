/**
 * DATEV-Angaben eines Ausgangsbelegs (#187), ohne React, damit sie testbar sind.
 *
 * Die Regeln (Kundennummer, sonst Sammel-Debitor; Erlöskonto je Steuermodus
 * und -satz) liegen in der Datenbank (`datev_resolve_sales_accounts`, Strang
 * B). Beim Festschreiben legt `finalize_sales_document` das Ergebnis am Beleg
 * ab. Hier wird es nur für Hinweise und die Anzeige aufbereitet.
 */

/** Eine Zeile aus `datev_resolve_sales_accounts`. */
export type DatevResolvedRow = {
  tax_mode: string;
  tax_rate_percent: number;
  revenue_account: string | null;
  debtor_account: string | null;
  debtor_source: string | null;
  warnings: string[] | null;
};

export type DatevReleaseHint =
  | { kind: 'debtorCollective'; reason: 'missing' | 'invalid'; account: string }
  | { kind: 'debtorUnresolved' }
  | { kind: 'accountMissing'; taxMode: string; rate: number };

/**
 * Was vor dem Freigeben zu sagen ist. Fehlende Berater- oder Mandantennummer
 * betrifft den Export, nicht den Beleg, und bleibt hier außen vor.
 */
export function datevReleaseHints(rows: readonly DatevResolvedRow[]): DatevReleaseHint[] {
  const first = rows[0];
  if (!first) return [];
  const warnings = new Set(first.warnings ?? []);
  const hints: DatevReleaseHint[] = [];

  if (warnings.has('debtor_unresolved')) hints.push({ kind: 'debtorUnresolved' });
  else if (first.debtor_source === 'collective' && first.debtor_account)
    hints.push({
      kind: 'debtorCollective',
      reason: warnings.has('debtor_invalid') ? 'invalid' : 'missing',
      account: first.debtor_account,
    });

  for (const row of rows) {
    if (!row.revenue_account)
      hints.push({
        kind: 'accountMissing',
        taxMode: row.tax_mode,
        rate: Number(row.tax_rate_percent),
      });
  }
  return hints;
}

/** Eine abgelegte Erlöszeile aus `sales_document_datev_accounts`. */
export type DatevRevenueAccount = {
  tax_mode: string;
  tax_rate_percent: number;
  net_amount: number;
  revenue_account: string;
  tax_key: string;
};

/** Erlöszeilen wie in den DATEV-Einstellungen: erst Regelsteuer, 19 % vor 7 %. */
export function sortRevenueAccounts(rows: readonly DatevRevenueAccount[]): DatevRevenueAccount[] {
  const order = ['standard', 'reverse_charge', 'tax_free', 'small_business'];
  const rank = (mode: string) => {
    const index = order.indexOf(mode);
    return index === -1 ? order.length : index;
  };
  return [...rows].sort(
    (a, b) =>
      rank(a.tax_mode) - rank(b.tax_mode) ||
      Number(b.tax_rate_percent) - Number(a.tax_rate_percent),
  );
}
