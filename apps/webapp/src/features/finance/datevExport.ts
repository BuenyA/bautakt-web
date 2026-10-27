/**
 * Reine Hilfen für den „Export im DATEV-Format“ (#168): Monatsauswahl und
 * Antwort von `datev-export` lesen. Ohne React und Supabase, damit sie mit
 * `node --test` laufen.
 *
 * Die Datei selbst baut die Edge Function (`bautakt-app`,
 * `supabase/functions/datev-export`). Hier wird nur ausgewählt, geladen und
 * erklärt, warum ein Export nicht geht.
 */

export type ExportMonth = { year: number; month: number };

/** Befund-Codes von `datev-export` (`bookings.ts`). */
export const FINDING_CODES = [
  'numbers_missing',
  'currency',
  'issue_date_missing',
  'chart_mismatch',
  'debtor_missing',
  'debtor_length',
  'account_missing',
  'account_length',
  'split_mismatch',
  'total_mismatch',
  'cost_center_invalid',
  'collective_debtor',
  'document_number_changed',
  'chars_replaced',
  'no_bookings',
] as const;

export type FindingCode = (typeof FINDING_CODES)[number];

export type Finding = {
  code: FindingCode;
  severity: 'error' | 'warning';
  document?: string;
  value?: string;
};

export type ExportOutcome =
  | { kind: 'file'; fileName: string; bytes: Uint8Array; bookings: number; findings: Finding[] }
  | { kind: 'empty'; findings: Finding[] }
  | { kind: 'blocked'; findings: Finding[] }
  | { kind: 'failed'; reason: FailureReason };

export type FailureReason = 'auth' | 'forbidden' | 'unknown';

/** Prüfung vor dem Download (`check_only`, #169). */
export type CheckOutcome =
  | { kind: 'checked'; importable: boolean; bookings: number; findings: Finding[] }
  | { kind: 'failed'; reason: FailureReason };

/**
 * Vorgabe ist der Vormonat: Exportiert wird, wenn der Monat abgeschlossen
 * ist. `todayIso` im Format `YYYY-MM-DD`.
 */
export function previousMonth(todayIso: string): ExportMonth {
  const year = Number(todayIso.slice(0, 4));
  const month = Number(todayIso.slice(5, 7));
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Der laufende Monat und die `count - 1` davor, neueste zuerst. */
export function monthOptions(todayIso: string, count: number): ExportMonth[] {
  let year = Number(todayIso.slice(0, 4));
  let month = Number(todayIso.slice(5, 7));
  const out: ExportMonth[] = [];
  for (let index = 0; index < count; index += 1) {
    out.push({ year, month });
    if (month === 1) {
      year -= 1;
      month = 12;
    } else {
      month -= 1;
    }
  }
  return out;
}

export function monthValue({ year, month }: ExportMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthValue(value: string): ExportMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year: Number(match[1]), month } : null;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

const KNOWN_CODES = new Set<string>(FINDING_CODES);

/**
 * Nur Befunde mit bekanntem Code. Ein unbekannter Code heißt, dass die
 * Function neuer ist als die Oberfläche; er wird als Fehler gezählt, damit er
 * nicht still verschwindet.
 */
function readFindings(value: unknown): { findings: Finding[]; unknown: number } {
  if (!Array.isArray(value)) return { findings: [], unknown: 0 };
  const findings: Finding[] = [];
  let unknown = 0;
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const { code, severity, document, value: detail } = entry as Record<string, unknown>;
    if (typeof code !== 'string' || !KNOWN_CODES.has(code)) {
      unknown += 1;
      continue;
    }
    findings.push({
      code: code as FindingCode,
      severity: severity === 'warning' ? 'warning' : 'error',
      ...(typeof document === 'string' && document ? { document } : {}),
      ...(typeof detail === 'string' && detail ? { value: detail } : {}),
    });
  }
  return { findings, unknown };
}

/**
 * Antwort von `datev-export` einordnen. `status` ist der HTTP-Status,
 * `body` das gelesene JSON (oder `null`, wenn keins kam).
 */
export function readExportResponse(status: number, body: unknown): ExportOutcome {
  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (status === 401) return { kind: 'failed', reason: 'auth' };
  if (status === 403) return { kind: 'failed', reason: 'forbidden' };

  const { findings, unknown } = readFindings(payload.findings);
  if (status === 422 && payload.error === 'export_blocked') {
    return { kind: 'blocked', findings };
  }
  if (status !== 200 || payload.ok !== true || unknown > 0) {
    return { kind: 'failed', reason: 'unknown' };
  }
  if (payload.content_base64 === null && payload.bookings === 0) {
    return { kind: 'empty', findings };
  }
  if (
    typeof payload.content_base64 !== 'string' ||
    typeof payload.file_name !== 'string' ||
    typeof payload.bookings !== 'number' ||
    payload.bookings <= 0
  ) {
    return { kind: 'failed', reason: 'unknown' };
  }
  return {
    kind: 'file',
    fileName: payload.file_name,
    bytes: base64ToBytes(payload.content_base64),
    bookings: payload.bookings,
    findings,
  };
}

/**
 * Antwort der Prüfung (`check_only: true`) einordnen. Die Function antwortet
 * dabei immer mit 200; ob der Monat importierbar ist, steht in `importable`.
 */
export function readCheckResponse(status: number, body: unknown): CheckOutcome {
  const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (status === 401) return { kind: 'failed', reason: 'auth' };
  if (status === 403) return { kind: 'failed', reason: 'forbidden' };
  const { findings, unknown } = readFindings(payload.findings);
  if (
    status !== 200 ||
    payload.ok !== true ||
    payload.check_only !== true ||
    typeof payload.importable !== 'boolean' ||
    typeof payload.bookings !== 'number' ||
    unknown > 0
  ) {
    return { kind: 'failed', reason: 'unknown' };
  }
  return { kind: 'checked', importable: payload.importable, bookings: payload.bookings, findings };
}
