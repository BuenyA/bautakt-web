/**
 * Reine Hilfen für den „Export im DATEV-Format“ (#168): Monatsauswahl und
 * Antwort von `datev-export` lesen. Ohne React und Supabase, damit sie mit
 * `node --test` laufen.
 *
 * Die Datei selbst baut die Edge Function (`bautakt-app`,
 * `supabase/functions/datev-export`). Hier wird nur ausgewählt, geladen und
 * erklärt, warum ein Export nicht geht.
 */

import { zipSync } from 'fflate';

export type ExportMonth = { year: number; month: number };

/** Ausgangs- oder Eingangsrechnungen; je Richtung ein eigener Buchungsstapel. */
export type ExportDirection = 'outgoing' | 'incoming';

export const EXPORT_DIRECTIONS: readonly ExportDirection[] = ['outgoing', 'incoming'];

export function parseDirection(value: string): ExportDirection {
  return value === 'incoming' ? 'incoming' : 'outgoing';
}

/** Beleg im Export: ID und Belegfeld 1, wie es im Buchungsstapel steht. */
export type ExportDocumentRef = { id: string; documentNumber: string; documentField1: string };

/** Befund-Codes von `datev-export` (`bookings.ts`, Eingang `incoming.ts`). */
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
  'creditor_missing',
  'creditor_length',
  'supplier_number_invalid',
  'collective_creditor',
  'not_approved',
  'tax_lines_missing',
  'category_account_length',
  'tax_key_unknown',
  'document_number_missing',
  // Skonto der Eingangsrechnungen (bautakt-web#172)
  'skonto_expense_account',
  'skonto_payment_missing',
] as const;

export type FindingCode = (typeof FINDING_CODES)[number];

export type Finding = {
  code: FindingCode;
  severity: 'error' | 'warning';
  document?: string;
  value?: string;
};

export type ExportOutcome =
  | {
      kind: 'file';
      fileName: string;
      bytes: Uint8Array;
      bookings: number;
      findings: Finding[];
      documents: ExportDocumentRef[];
    }
  | { kind: 'empty'; findings: Finding[] }
  | { kind: 'blocked'; findings: Finding[] }
  | { kind: 'failed'; reason: FailureReason };

export type FailureReason = 'auth' | 'forbidden' | 'unknown';

/** Prüfung vor dem Download (`check_only`, #169). */
export type CheckOutcome =
  | {
      kind: 'checked';
      importable: boolean;
      bookings: number;
      findings: Finding[];
      documents: ExportDocumentRef[];
    }
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

/** Belegliste der Function; `null`, wenn sie fehlt oder kaputt ist. */
function readDocuments(value: unknown): ExportDocumentRef[] | null {
  if (!Array.isArray(value)) return null;
  const out: ExportDocumentRef[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const { id, document_number, document_field1 } = entry as Record<string, unknown>;
    if (
      typeof id !== 'string' ||
      typeof document_number !== 'string' ||
      typeof document_field1 !== 'string'
    ) {
      return null;
    }
    out.push({ id, documentNumber: document_number, documentField1: document_field1 });
  }
  return out;
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
  const documents = readDocuments(payload.documents);
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
    payload.bookings <= 0 ||
    documents === null
  ) {
    return { kind: 'failed', reason: 'unknown' };
  }
  return {
    kind: 'file',
    fileName: payload.file_name,
    bytes: base64ToBytes(payload.content_base64),
    bookings: payload.bookings,
    findings,
    documents,
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
  const documents = readDocuments(payload.documents);
  if (
    status !== 200 ||
    payload.ok !== true ||
    payload.check_only !== true ||
    typeof payload.importable !== 'boolean' ||
    typeof payload.bookings !== 'number' ||
    unknown > 0 ||
    documents === null
  ) {
    return { kind: 'failed', reason: 'unknown' };
  }
  return {
    kind: 'checked',
    importable: payload.importable,
    bookings: payload.bookings,
    findings,
    documents,
  };
}

export function zipFileName({ year, month }: ExportMonth, direction: ExportDirection): string {
  const kind = direction === 'incoming' ? 'Eingang' : 'Ausgang';
  return `Belege_${kind}_${year}-${String(month).padStart(2, '0')}.zip`;
}

/**
 * Endung aus dem Speicherpfad (`…/incoming/{id}.xml`). Die Ablage setzt sie
 * aus dem Inhalt (#161); ohne Endung bleibt `pdf`.
 */
export function storageExtension(path: string): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(path);
  return match ? match[1]!.toLowerCase() : 'pdf';
}

/**
 * Dateiname je Beleg im ZIP: Belegfeld 1 + Endung (Vorgabe `pdf`), damit die
 * Steuerberatung Buchung und Beleg zusammenbringt. `/` und `*` erlaubt DATEV
 * im Belegfeld, Windows aber nicht im Dateinamen; sie werden zu `_`. Doppelte
 * Namen bekommen `_2`, `_3` …, statt sich im ZIP zu überschreiben.
 */
export function zipEntryNames(
  documents: readonly ExportDocumentRef[],
  extensionOf: (id: string) => string = () => 'pdf',
): Map<string, string> {
  const names = new Map<string, string>();
  const used = new Set<string>();
  for (const document of documents) {
    const base =
      document.documentField1.replace(/[/*]/g, '_') || `Beleg_${document.id.slice(0, 8)}`;
    const extension = extensionOf(document.id);
    let name = `${base}.${extension}`;
    for (let index = 2; used.has(name.toLowerCase()); index += 1) {
      name = `${base}_${index}.${extension}`;
    }
    used.add(name.toLowerCase());
    names.set(document.id, name);
  }
  return names;
}

const TAX_MODE_LABEL: Record<string, string> = {
  standard: '',
  reverse_charge: '§ 13b, ',
  tax_free: 'steuerfrei',
  small_business: 'Kleinunternehmer',
};

/**
 * Steuerart und Satz aus einem Befund (`reverse_charge|19.00`) lesbar machen:
 * „§ 13b, 19 %“, „7 %“, „steuerfrei“. Andere Werte bleiben, wie sie sind.
 */
export function formatTaxValue(value: string): string {
  const match = /^([a-z_]+)\|(-?\d+(?:\.\d+)?)$/.exec(value);
  const label = match ? TAX_MODE_LABEL[match[1]!] : undefined;
  if (!match || label === undefined) return value;
  if (match[1] === 'tax_free' || match[1] === 'small_business') return label;
  const rate = Number(match[2]).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  return `${label}${rate} %`;
}

/**
 * ZIP ohne Kompression: PDFs sind schon komprimiert, ein zweites Mal
 * spart nichts und kostet nur Zeit im Browser.
 */
export function buildZip(entries: readonly { name: string; bytes: Uint8Array }[]): Uint8Array {
  return zipSync(
    Object.fromEntries(entries.map((entry) => [entry.name, [entry.bytes, { level: 0 }]])),
  );
}
