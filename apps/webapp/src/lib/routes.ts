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

  // Geschuetzt — kanonische Top-Nav IA (Wave 1)
  overview: '/uebersicht',
  orders: '/auftraege',
  order: (id: string) => `/auftraege/${id}`,
  assignments: '/einsaetze',
  times: '/zeiten',
  invoices: '/rechnungen',
  customers: '/kunden',
  customer: (id: string) => `/kunden/${id}`,
  settings: '/einstellungen',

  // Alte Pfade: Redirects bleiben, bis Bookmarks und Mails umgezogen sind.
  legacyEmployees: '/mitarbeiter',
  legacyFinance: '/finanzen',
  legacyCalendar: '/kalender',
  legacyNotifications: '/benachrichtigungen',
} as const;

/** Startseite nach dem Anmelden. */
export const HOME_ROUTE = routes.overview;
