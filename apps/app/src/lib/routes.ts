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

  // Geschuetzt
  orders: '/auftraege',
  order: (id: string) => `/auftraege/${id}`,
  customers: '/kunden',
  employees: '/mitarbeiter',
  finance: '/finanzen',
  calendar: '/kalender',
  notifications: '/benachrichtigungen',
  settings: '/einstellungen',
} as const;

/** Startseite nach dem Anmelden. */
export const HOME_ROUTE = routes.orders;
