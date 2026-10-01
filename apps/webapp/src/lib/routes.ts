/**
 * Alle Routenpfade an einer Stelle. Pfade sind deutsch, weil die Anwendung
 * deutsch ist und die URL Teil der Oberflaeche.
 *
 * Nie einen Pfad als Zeichenkette in eine Komponente schreiben — sonst findet
 * eine Umbenennung nie alle Stellen.
 */

/** Query auf `/zeiten`, der die Liste auf eine `order_id` filtert. */
export const timesOrderParam = 'order';

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
  assignments: '/einsaetze',
  assignment: (id: string) => `/einsaetze/${id}`,
  calendar: '/kalender',
  times: '/zeiten',
  /**
   * Zeitenliste, eingeschraenkt auf einen Auftrag.
   * Parametername steht in `timesOrderParam` — die Liste liest denselben Namen.
   */
  timesForOrder: (orderId: string) => `/zeiten?${timesOrderParam}=${encodeURIComponent(orderId)}`,

  // Finanzen — `/finanzen` ist der Hub, die Listen bleiben wo sie sind.
  financeHub: '/finanzen',
  quotes: '/angebote',
  quote: (id: string) => `/angebote/${id}`,
  quoteNew: '/angebote/neu',
  invoices: '/rechnungen',
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
  payroll: '/lohn',

  // Kunden direkt, Material als Hub. Katalog und Kostenstellen bleiben.
  customers: '/kunden',
  customer: (id: string) => `/kunden/${id}`,
  materialHub: '/material',
  catalog: '/katalog',
  costCenters: '/kostenstellen',

  settings: '/einstellungen',

  // Alte Pfade: Redirects bleiben, bis Bookmarks und Mails umgezogen sind.
  // `/mitarbeiter`, `/finanzen` und `/kalender` sind echte Seiten. `/finanzen`
  // ist der Hub, kein Redirect mehr auf Rechnungen.
  legacyNotifications: '/benachrichtigungen',
} as const;

/** Startseite nach dem Anmelden. */
export const HOME_ROUTE = routes.overview;
