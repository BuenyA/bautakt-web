import { hasPermission, type PermissionKey } from '@bautakt/core';
import type { UiconName } from '@bautakt/ui';

import { routes } from '@/lib/routes';

export type NavItem = {
  to: string;
  labelKey: string;
  /** Name aus der Icon-Schrift — identisch zu dem, was die Handy-App zeigt. */
  icon: UiconName;
  /**
   * Recht, das den Eintrag sichtbar macht. Fehlt es, ist der Eintrag fuer alle
   * Angemeldeten sichtbar.
   *
   * ⚠️ Das Ausblenden ist Fuehrung, keine Kontrolle. Wer die Adresse kennt,
   * ruft die Route trotzdem auf — die verbindliche Grenze sind die
   * RLS-Policies in der Datenbank.
   */
  permission?: PermissionKey;
  /** Mehrere Rechte: eines genuegt (z. B. lesen ODER schreiben). */
  anyPermission?: PermissionKey[];
};

export type NavGroup = {
  /** Fehlt die Ueberschrift, steht die Gruppe ohne Trennung ganz oben. */
  labelKey?: string;
  items: NavItem[];
};

/**
 * Die Seitenleiste fuer Geschaeftsfuehrung und Buchhaltung.
 *
 * Die Begriffe sind die der Handy-App (Auftraege, Einsaetze, Zeiten, Kunden,
 * Rechnungen …), die Anordnung ist es bewusst nicht: am Telefon liegt alles
 * ausser den Auftraegen unter „Unternehmen", weil dort nur fuenf Reiter Platz
 * haben. Am Rechner waere dieser Hub ein zusaetzlicher Klick vor jeder
 * Rechnung — deshalb stehen die Bereiche hier nebeneinander, gruppiert nach
 * Arbeit, Finanzen, Team und Stammdaten.
 *
 * Reihenfolge innerhalb der Gruppen folgt der Haeufigkeit im Buero, nicht dem
 * Alphabet.
 */
export const navGroups: NavGroup[] = [
  {
    items: [{ to: routes.overview, labelKey: 'common:nav.overview', icon: 'home' }],
  },
  {
    labelKey: 'common:nav.groups.work',
    items: [
      { to: routes.orders, labelKey: 'common:nav.orders', icon: 'briefcase' },
      { to: routes.assignments, labelKey: 'common:nav.assignments', icon: 'users' },
      { to: routes.calendar, labelKey: 'common:nav.calendar', icon: 'calendar' },
      { to: routes.times, labelKey: 'common:nav.times', icon: 'clock' },
    ],
  },
  {
    labelKey: 'common:nav.groups.finance',
    items: [
      {
        to: routes.quotes,
        labelKey: 'common:nav.quotes',
        icon: 'file-edit',
        anyPermission: ['canUseBillingModule', 'canViewManagementInvoices'],
      },
      {
        to: routes.invoices,
        labelKey: 'common:nav.invoices',
        icon: 'file-invoice',
        anyPermission: ['canUseBillingModule', 'canViewManagementInvoices'],
      },
      {
        to: routes.receivables,
        labelKey: 'common:nav.receivables',
        icon: 'money-bill-wave',
        permission: 'canViewCompanyFinance',
      },
      {
        to: routes.expenses,
        labelKey: 'common:nav.expenses',
        icon: 'receipt',
        anyPermission: ['canViewCompanyFinance', 'canManageOverheadCosts'],
      },
      {
        to: routes.dunning,
        labelKey: 'common:nav.dunning',
        icon: 'megaphone',
        anyPermission: ['canUseBillingModule', 'canViewCompanyFinance'],
      },
      {
        to: routes.reports,
        labelKey: 'common:nav.reports',
        icon: 'chart-histogram',
        permission: 'canViewCompanyFinance',
      },
    ],
  },
  {
    labelKey: 'common:nav.groups.team',
    items: [
      {
        to: routes.employees,
        labelKey: 'common:nav.employees',
        icon: 'user',
        permission: 'canManageEmployees',
      },
      {
        to: routes.absences,
        labelKey: 'common:nav.absences',
        icon: 'umbrella-beach',
        permission: 'canManageAbsences',
      },
      {
        to: routes.payroll,
        labelKey: 'common:nav.payroll',
        icon: 'wallet',
        anyPermission: ['canViewWageCosts', 'canManageRates'],
      },
    ],
  },
  {
    labelKey: 'common:nav.groups.masterData',
    items: [
      {
        to: routes.customers,
        labelKey: 'common:nav.customers',
        icon: 'users',
        permission: 'canManageCustomers',
      },
      {
        to: routes.catalog,
        labelKey: 'common:nav.catalog',
        icon: 'box',
        permission: 'canManageCatalog',
      },
      {
        to: routes.costCenters,
        labelKey: 'common:nav.costCenters',
        icon: 'layers',
        permission: 'canManageCostCenters',
      },
    ],
  },
];

/** Unten in der Leiste, abgesetzt vom Rest. */
export const settingsNavItem: NavItem = {
  to: routes.settings,
  labelKey: 'common:nav.settings',
  icon: 'settings',
};

/**
 * Ein Eintrag mit `anyPermission` genuegt sich mit einem der Rechte: die
 * Rechnungsliste etwa sehen sowohl die Buchhaltung (Abrechnungsmodul) als auch
 * die Geschaeftsfuehrung (Einsicht in Rechnungen).
 */
export function maySee(item: NavItem, permissions: Parameters<typeof hasPermission>[0]): boolean {
  if (item.permission && !hasPermission(permissions, item.permission)) return false;
  if (item.anyPermission && !item.anyPermission.some((key) => hasPermission(permissions, key))) {
    return false;
  }
  return true;
}
