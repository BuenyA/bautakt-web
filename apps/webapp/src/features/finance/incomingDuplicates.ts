/**
 * Mögliche Dubletten aus der View `incoming_duplicate_matches` (bautakt-web#288),
 * ohne React und ohne Supabase, damit es mit `node --test` läuft. Die Regeln für
 * einen Treffer stehen in der Migration in `bautakt-app`.
 */

export type DuplicateMatchRaw = {
  kind: string | null;
  id: string | null;
  match: string | null;
  other_kind: string | null;
  other_id: string | null;
  other_label: string | null;
};

export type DuplicateMatch = {
  match: 'file' | 'number';
  otherKind: 'invoice' | 'file';
  otherId: string;
  otherLabel: string;
};

export type DuplicateIndex = {
  invoices: ReadonlyMap<string, readonly DuplicateMatch[]>;
  files: ReadonlyMap<string, readonly DuplicateMatch[]>;
};

/** Gruppiert je Eintrag. Zeilen mit unbekannten Werten fallen weg. */
export function indexDuplicates(rows: readonly DuplicateMatchRaw[]): DuplicateIndex {
  const invoices = new Map<string, DuplicateMatch[]>();
  const files = new Map<string, DuplicateMatch[]>();
  for (const row of rows) {
    const target = row.kind === 'invoice' ? invoices : row.kind === 'file' ? files : null;
    if (!target || !row.id || !row.other_id) continue;
    if (row.match !== 'file' && row.match !== 'number') continue;
    if (row.other_kind !== 'invoice' && row.other_kind !== 'file') continue;
    const list = target.get(row.id) ?? [];
    list.push({
      match: row.match,
      otherKind: row.other_kind,
      otherId: row.other_id,
      otherLabel: row.other_label?.trim() ?? '',
    });
    target.set(row.id, list);
  }
  return { invoices, files };
}

/** Grund für das Kennzeichen: Dieselbe Datei wiegt schwerer als dieselbe Nummer. */
export function duplicateReason(matches: readonly DuplicateMatch[]): 'file' | 'number' | null {
  if (matches.length === 0) return null;
  return matches.some((match) => match.match === 'file') ? 'file' : 'number';
}
