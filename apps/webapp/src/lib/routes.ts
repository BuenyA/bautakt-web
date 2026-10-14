/**
 * Alle Routenpfade an einer Stelle. Pfade sind deutsch, weil die Anwendung
 * deutsch ist und die URL Teil der Oberflaeche.
 *
 * Nie einen Pfad als Zeichenkette in eine Komponente schreiben — sonst findet
 * eine Umbenennung nie alle Stellen.
 */

/**
 * Query, der auf einer Listenseite das Anlege-Panel öffnet (`/kunden?neu=1`).
 * Die Schnellsuche in der Kopfzeile springt so direkt in „Neuer Kunde“. Die
 * Seite liest ihn über `useCreateFromUrl` und entfernt ihn danach.
 */
export const createParam = 'neu';

/** Listenpfad mit geöffnetem Anlege-Panel. */
export function withCreate(path: string): string {
  return `${path}?${createParam}=1`;
}

/** Query der alten Zeitenliste `/zeiten?order=…`; die Umleitung liest ihn noch. */
export const legacyTimesOrderParam = 'order';

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
  invoiceNew: '/rechnungen/neu',
  invoiceEdit: (id: string) => `/rechnungen/${id}/bearbeiten`,
  invoicePrint: (id: string) => `/rechnungen/${id}/druck`,
  receivables: '/offene-posten',
  expenses: '/ausgaben',
  dunning: '/mahnwesen',
  reports: '/auswertungen',

  // Team — Hub `/personal`, Verzeichnis bleibt `/mitarbeiter`.
  personalHub: '/personal',
  employees: '/mitarbeiter',
  employee: (id: string) => `/mitarbeiter/${id}`,
  absences: '/abwesenheiten',
  absence: (id: string) => `/abwesenheiten/${id}`,
  payroll: '/lohn',

  // Kunden direkt, Material als Hub. Katalog und Kostenstellen bleiben.
  customers: '/kunden',
  customer: (id: string) => `/kunden/${id}`,
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
