/**
 * Alle Routenpfade an einer Stelle. Pfade sind deutsch, weil die Anwendung
 * deutsch ist und die URL Teil der Oberflaeche.
 *
 * Nie einen Pfad als Zeichenkette in eine Komponente schreiben — sonst findet
 * eine Umbenennung nie alle Stellen.
 */
export const routes = {
  // Oeffentlich
  login: '/login',
  register: '/registrieren',
  forgotPassword: '/passwort-vergessen',
  resetPassword: '/passwort-zuruecksetzen',

  // Geschuetzt — Bereiche wie in der Handy-App benannt, am Desktop aber flach
  // nebeneinander statt in einem Hub verschachtelt.
  overview: '/uebersicht',

  // Arbeit
  orders: '/auftraege',
  order: (id: string) => `/auftraege/${id}`,
  assignments: '/einsaetze',
  assignment: (id: string) => `/einsaetze/${id}`,
  calendar: '/kalender',
  times: '/zeiten',

  // Finanzen
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

  // Team
  employees: '/mitarbeiter',
  employee: (id: string) => `/mitarbeiter/${id}`,
  absences: '/abwesenheiten',
  payroll: '/lohn',

  // Stammdaten
  customers: '/kunden',
  customer: (id: string) => `/kunden/${id}`,
  catalog: '/katalog',
  costCenters: '/kostenstellen',

  settings: '/einstellungen',

  // Alte Pfade: Redirects bleiben, bis Bookmarks und Mails umgezogen sind.
  // `/mitarbeiter`, `/finanzen` und `/kalender` sind inzwischen echte Seiten;
  // uebrig bleibt, was keinen eigenen Bereich bekommen hat.
  legacyFinance: '/finanzen',
  legacyNotifications: '/benachrichtigungen',
} as const;

/** Startseite nach dem Anmelden. */
export const HOME_ROUTE = routes.overview;
