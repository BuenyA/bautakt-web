/**
 * Alle Routenpfade an einer Stelle. Pfade sind deutsch, weil die Anwendung
 * deutsch ist und die URL Teil der Oberflaeche.
 *
 * Nie einen Pfad als Zeichenkette in eine Komponente schreiben — sonst findet
 * eine Umbenennung nie alle Stellen.
 */

/**
 * Query, der auf einer Listenseite das Anlege-Panel öffnet (`/kontakte?neu=1`).
 * Die Schnellsuche in der Kopfzeile springt so direkt in „Neuer Kontakt“. Die
 * Seite liest ihn über `useCreateFromUrl` und entfernt ihn danach.
 */
export const createParam = 'neu';

/** Listenpfad mit geöffnetem Anlege-Panel. */
export function withCreate(path: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}${createParam}=1`;
}

/** Query der alten Zeitenliste `/zeiten?order=…`; die Umleitung liest ihn noch. */
export const legacyTimesOrderParam = 'order';

/** Query von `/rechnungen/neu?auftrag=…`: der Editor übernimmt diesen Auftrag. */
export const invoiceFromOrderParam = 'auftrag';

/** Query von `/rechnungen/neu?gutschrift=…`: Gutschrift zu dieser Rechnung. */
export const creditNoteFromParam = 'gutschrift';

/**
 * Query, der auf der Belegseite den Versanddialog öffnet (`?versenden=1`),
 * etwa nach „Festschreiben und danach versenden“ (#186). Die Seite entfernt
 * ihn danach.
 */
export const sendParam = 'versenden';

export const routes = {
  // Oeffentlich
  login: '/login',
  register: '/registrieren',
  forgotPassword: '/passwort-vergessen',
  resetPassword: '/passwort-zuruecksetzen',

  // Geschuetzt. Die Top-Nav ist flach (zehn Punkte). Drei davon sind Hubs;
  // die Listen dahinter behalten ihre Pfade.
  overview: '/uebersicht',

  // Arbeit — direkt in der Leiste
  orders: '/auftraege',
  order: (id: string) => `/auftraege/${id}`,
  assignments: '/einsatzplanung',
  assignment: (id: string) => `/einsatzplanung/${id}`,
  calendar: '/kalender',

  // Rechnungen — `/rechnungen` ist die Übersicht des Bereichs, die Liste der
  // Ausgangsrechnungen liegt darunter. Belege bleiben `/rechnungen/:id`
  // (statische Segmente wie `ausgang` und `neu` gewinnen gegen `:id`).
  financeHub: '/rechnungen',
  quotes: '/angebote',
  quote: (id: string) => `/angebote/${id}`,
  quoteNew: '/angebote/neu',
  invoices: '/rechnungen/ausgang',
  invoice: (id: string) => `/rechnungen/${id}`,
  invoiceSend: (id: string) => `/rechnungen/${id}?${sendParam}=1`,
  invoiceNew: '/rechnungen/neu',
  /** Neue Rechnung mit Kunde und Positionen eines Auftrags (`?auftrag=`). */
  invoiceNewFromOrder: (orderId: string) =>
    `/rechnungen/neu?${invoiceFromOrderParam}=${encodeURIComponent(orderId)}`,
  /** Neue Gutschrift zu einer Rechnung (`?gutschrift=`). */
  invoiceNewCreditNote: (invoiceId: string) =>
    `/rechnungen/neu?${creditNoteFromParam}=${encodeURIComponent(invoiceId)}`,
  invoiceEdit: (id: string) => `/rechnungen/${id}/bearbeiten`,
  invoicePrint: (id: string) => `/rechnungen/${id}/druck`,
  receivables: '/offene-posten',
  /** Eingangsrechnungen und sonstige Ausgaben (zwei Register). */
  expenses: '/rechnungen/eingang',
  dunning: '/mahnwesen',
  reports: '/auswertungen',
  /** Buchungsstapel und Belege eines Monats für die Steuerberatung (#169). */
  datevExport: '/rechnungen/datev-export',

  // Team — Hub `/personal`, Verzeichnis bleibt `/mitarbeiter`.
  personalHub: '/personal',
  employees: '/mitarbeiter',
  employee: (id: string) => `/mitarbeiter/${id}`,
  absences: '/abwesenheiten',
  absence: (id: string) => `/abwesenheiten/${id}`,
  payroll: '/lohn',

  // Kontakte direkt (Kunden, Lieferanten, Subunternehmer, Sonstige als
  // Reiter), Material als Hub. Katalog und Kostenstellen bleiben.
  contacts: '/kontakte',
  contact: (id: string) => `/kontakte/${id}`,
  materialHub: '/material',
  catalog: '/katalog',
  costCenters: '/kostenstellen',

  settings: '/einstellungen',

  // Alte Pfade: Redirects bleiben, bis Bookmarks und Mails umgezogen sind.
  // `/mitarbeiter` und `/kalender` sind echte Seiten.
  legacyNotifications: '/benachrichtigungen',
  /**
   * Bis 2026-10-14 lag die Rechnungs-Übersicht unter `/finanzen`, und
   * `/rechnungen` war die Liste der Ausgangsrechnungen.
   */
  legacyFinance: '/finanzen',
  /** Bis 2026-10-14 lagen die Eingangsrechnungen unter `/ausgaben`. */
  legacyExpenses: '/ausgaben',
  /** Bis 2026-10-14 gab es nur Kunden unter `/kunden`; jetzt Kontakte. */
  legacyCustomers: '/kunden',
  /** Bis 2026-10-11 hieß die Einsatzplanung „Einsätze“. */
  legacyAssignments: '/einsaetze',
  /**
   * Bis 2026-10-11 gab es den Bereich „Zeiten“. Zeiten stehen jetzt im Auftrag
   * und auf der Mitarbeiterseite; `?order=` führt auf den Auftrag.
   */
  legacyTimes: '/zeiten',
} as const;

/** Startseite nach dem Anmelden. */
export const HOME_ROUTE = routes.overview;
