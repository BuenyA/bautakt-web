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
  WORK_ASSIGNMENT_ABSENCE_CONFLICT:
    'Ein Mitarbeiter ist in diesem Zeitraum abwesend (genehmigt). Erst die Abwesenheit klären oder ihn aus dem Einsatz nehmen.',
  INVALID_DATE_RANGE: 'Das Ende liegt vor dem Beginn.',
  INVALID_STATUS: 'Über diese Abwesenheit wurde bereits entschieden.',
  INVALID_STATUS_TRANSITION:
    'Diese Abwesenheit wurde inzwischen schon bearbeitet. Bitte die Liste neu laden.',
  ABSENCE_NOT_FOUND: 'Diese Abwesenheit existiert nicht mehr.',
  EMPLOYMENT_NOT_FOUND: 'Diesen Mitarbeiter gibt es nicht mehr.',
  INVALID_DAILY_REPORT: 'Dem Bericht fehlt ein Pflichtfeld.',
  INVALID_TIME_ENTRY: 'Beginn oder Ende der Zeit fehlt.',
  CHECKLIST_ASSIGNEE_INACTIVE: 'Dieser Mitarbeiter ist nicht mehr im Betrieb.',
  CHECKLIST_ITEM_MISSING: 'Dieser Punkt existiert nicht mehr.',
  CHECKLIST_CONFLICT: 'Die Checkliste wurde gerade geändert. Bitte noch einmal speichern.',
  FORBIDDEN: 'Dafür fehlt dir die Berechtigung.',
  NOT_AUTHENTICATED: 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.',
  MISSING_SERVICE_DATE:
    'Dem Beleg fehlt das Leistungsdatum. Es steht auf jeder Rechnung und ist Pflicht.',
  MISSING_SELLER_TAX_ID:
    'Dem Betrieb fehlt Steuernummer und USt-IdNr. Ohne eine der beiden ist die Rechnung nach EN16931 nicht gültig.',
  // GoBD-Sperren (bautakt-app 20261016175518_a_gobd_locks): Kopf, Positionen,
  // Archivfelder und Löschen eines festgeschriebenen Belegs.
  DOCUMENT_IMMUTABLE:
    'Dieser Beleg ist festgeschrieben und lässt sich nicht mehr ändern oder löschen. Korrigieren kannst du ihn nur noch per Storno.',
  DOCUMENT_FINALIZE_VIA_RPC:
    'Ein Beleg wird nur über „Festschreiben“ ausgestellt. Bitte lade die Seite neu und versuche es noch einmal.',
  // Kontakte (Migration 20261014204410). Unique-Verletzungen tragen den Namen
  // des Index in der Meldung.
  customer_profiles_number_unique: 'Diese Kundennummer ist schon vergeben.',
  supplier_profiles_number_unique: 'Diese Lieferantennummer ist schon vergeben.',
  contacts_company_vat_id_idx:
    'Ein Kontakt mit dieser USt-IdNr. existiert schon. Öffne ihn und ergänze dort die Rolle.',
  contact_bank_accounts_contact_id_iban_key: 'Diese IBAN ist bei dem Kontakt schon hinterlegt.',
  contacts_name_required: 'Bitte einen Namen angeben.',
  MERGE_INVALID: 'Diese beiden Kontakte lassen sich nicht zusammenführen.',
  CONTACT_IN_USE:
    'Der Kontakt hängt noch an Aufträgen oder Belegen. Archiviere ihn stattdessen – dann verschwindet er aus Listen und Auswahlfeldern.',
};

/**
 * Löschen eines Kontakts oder einer Rolle, an der noch Belege hängen: die
 * Fremdschlüssel melden 23503 mit der Tabelle des gelöschten Datensatzes.
 */
const CONTACT_TABLES =
  /on table "(contacts|customer_profiles|supplier_profiles|subcontractor_profiles|other_profiles)"/;

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

  if (codeOf(error) === '23503' && CONTACT_TABLES.test(raw)) {
    return MESSAGES.CONTACT_IN_USE;
  }

  for (const [code, message] of Object.entries(MESSAGES)) {
    // Die Codes stehen teils mit Doppelpunkt und Nachsatz in der Meldung.
    if (raw.includes(code)) return message;
  }
  return raw || null;
}
