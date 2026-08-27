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

export const navItems: NavItem[] = [
  { to: routes.orders, labelKey: 'common:nav.orders' },
  { to: routes.customers, labelKey: 'common:nav.customers', permission: 'canManageCustomers' },
  { to: routes.employees, labelKey: 'common:nav.employees', permission: 'canManageEmployees' },
  { to: routes.finance, labelKey: 'common:nav.finance', permission: 'canViewCompanyFinance' },
  { to: routes.calendar, labelKey: 'common:nav.calendar' },
  { to: routes.notifications, labelKey: 'common:nav.notifications' },
  { to: routes.settings, labelKey: 'common:nav.settings' },
];
