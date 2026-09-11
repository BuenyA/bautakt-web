import type { PermissionKey } from '@bautakt/core';

import { routes } from '@/lib/routes';

export type NavItem = {
  to: string;
  labelKey: string;
  /**
   * Recht, das den Eintrag sichtbar macht. Fehlt es, ist der Eintrag fuer alle
   * Angemeldeten sichtbar.
   *
   * ⚠️ Das Ausblenden ist Fuehrung, keine Kontrolle. Wer die Adresse kennt,
   * ruft die Route trotzdem auf — die verbindliche Grenze sind die
   * RLS-Policies in der Datenbank.
   */
  permission?: PermissionKey;
};

/**
 * Sichtbare Demo-Nav (GF 10.10.2026): Übersicht · Aufträge · Einsätze · Zeiten · Kunden.
 * Rechnungen und Einstellungen bleiben als Platzhalter-Routen erreichbar, aber
 * nicht in der Nav. HOME bleibt `/uebersicht`.
 *
 * Angebote sitzen als Filter unter Auftraege; Kalender spaeter unter Einsaetze;
 * Benachrichtigungen sind die Topbar-Glocke, kein Nav-Eintrag.
 */
export const navItems: NavItem[] = [
  { to: routes.overview, labelKey: 'common:nav.overview' },
  { to: routes.orders, labelKey: 'common:nav.orders' },
  { to: routes.assignments, labelKey: 'common:nav.assignments' },
  { to: routes.times, labelKey: 'common:nav.times' },
  {
    to: routes.customers,
    labelKey: 'common:nav.customers',
    permission: 'canManageCustomers',
  },
];
