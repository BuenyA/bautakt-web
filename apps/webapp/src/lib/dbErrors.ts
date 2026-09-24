/**
 * Fehlercodes der Datenbank in Klartext.
 *
 * Die RPCs und Trigger werfen bewusst maschinenlesbare Codes
 * (`ABSENCE_WORK_ASSIGNMENT_CONFLICT`, `MISSING_SERVICE_DATE` …). Ungefiltert
 * landen die in Grossbuchstaben vor dem Nutzer — technisch korrekt und
 * vollstaendig unbrauchbar.
 *
 * Hier stehen nur Codes, die tatsaechlich bei einer Aktion der Webapp
 * entstehen koennen. Alles Unbekannte behaelt seinen Originaltext: eine
 * unerklaerte Meldung ist besser als eine erfundene.
 */
const MESSAGES: Record<string, string> = {
  ABSENCE_WORK_ASSIGNMENT_CONFLICT:
    'In diesem Zeitraum ist für den Mitarbeiter schon ein Einsatz geplant. Erst den Einsatz umplanen, dann die Abwesenheit eintragen.',
  INVALID_DATE_RANGE: 'Das Ende liegt vor dem Beginn.',
  INVALID_STATUS: 'Über diese Abwesenheit wurde bereits entschieden.',
  ABSENCE_NOT_FOUND: 'Diese Abwesenheit existiert nicht mehr.',
  EMPLOYMENT_NOT_FOUND: 'Diesen Mitarbeiter gibt es nicht mehr.',
  FORBIDDEN: 'Dafür fehlt dir die Berechtigung.',
  NOT_AUTHENTICATED: 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.',
  MISSING_SERVICE_DATE:
    'Dem Beleg fehlt das Leistungsdatum. Es steht auf jeder Rechnung und ist Pflicht.',
  MISSING_SELLER_TAX_ID:
    'Dem Betrieb fehlt Steuernummer und USt-IdNr. Ohne eine der beiden ist die Rechnung nach EN16931 nicht gültig.',
};

function messageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string') return message;
  }
  return '';
}

function codeOf(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return '';
}

/** Lesbare Meldung zu einem Fehler; `null`, wenn es nichts Brauchbares gibt. */
export function readableDbError(error: unknown): string | null {
  const raw = messageOf(error);
  if (!raw && !codeOf(error)) return null;

  // PostgREST meldet eine abgelehnte RLS-Policy als 42501, ohne den
  // maschinenlesbaren Code `FORBIDDEN`, den die Trigger werfen.
  if (codeOf(error) === '42501' || /row-level security policy/i.test(raw)) {
    return MESSAGES.FORBIDDEN;
  }

  for (const [code, message] of Object.entries(MESSAGES)) {
    // Die Codes stehen teils mit Doppelpunkt und Nachsatz in der Meldung.
    if (raw.includes(code)) return message;
  }
  return raw || null;
}
