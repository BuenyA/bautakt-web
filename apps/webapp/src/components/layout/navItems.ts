import type { UiconName } from '@bautakt/ui';

import {
  hubById,
  hubDestinationForPath,
  passesGate,
  pathMatches,
  type HubId,
  type PermissionGate,
} from '@/features/hubs/hubs';
import { routes } from '@/lib/routes';

export type NavItem = PermissionGate & {
  to: string;
  labelKey: string;
  /** Name aus der Icon-Schrift — identisch zu dem, was die Handy-App zeigt. */
  icon: UiconName;
  /**
   * Hub-Punkt. Sichtbar, sobald mindestens eine seiner Karten sichtbar ist.
   * Fehlt jede Karte, verschwindet der Punkt — eine leere „Finanzen"-Zeile
   * waere ein Hinweis auf etwas, das der Angemeldete nicht aufrufen kann.
   */
  hubId?: HubId;
};

/**
 * Flache Top-Navigation, zehn Punkte. Einstellungen steht im Fuss und zaehlt
 * mit. Keine Sektionsueberschriften.
 *
 * Auftraege und Zeiten sind ein Klick. Finanzen, Mitarbeiter und Material
 * oeffnen einen Hub; die Listen dahinter behalten ihre Pfade.
 *
 * ⚠️ Das Ausblenden ist Fuehrung, keine Kontrolle. Wer die Adresse kennt,
 * ruft die Route trotzdem auf — die verbindliche Grenze sind die
 * RLS-Policies in der Datenbank.
 */
export const navItems: NavItem[] = [
  { to: routes.overview, labelKey: 'common:nav.overview', icon: 'home' },
  { to: routes.orders, labelKey: 'common:nav.orders', icon: 'briefcase' },
  { to: routes.assignments, labelKey: 'common:nav.assignments', icon: 'users' },
  { to: routes.times, labelKey: 'common:nav.times', icon: 'clock' },
  { to: routes.calendar, labelKey: 'common:nav.calendar', icon: 'calendar' },
  {
    to: routes.financeHub,
    labelKey: 'common:nav.finance',
    icon: 'wallet',
    hubId: 'finance',
  },
  {
    to: routes.personalHub,
    labelKey: 'common:nav.employees',
    icon: 'user',
    hubId: 'personal',
  },
  {
    to: routes.customers,
    labelKey: 'common:nav.customers',
    icon: 'users',
    permission: 'canManageCustomers',
  },
  {
    to: routes.materialHub,
    labelKey: 'common:nav.material',
    icon: 'boxes',
    hubId: 'material',
  },
];

/** Unten in der Leiste, abgesetzt vom Rest. Zaehlt als zehnter Punkt. */
export const settingsNavItem: NavItem = {
  to: routes.settings,
  labelKey: 'common:nav.settings',
  icon: 'settings',
};

export function maySee(item: NavItem, permissions: Parameters<typeof passesGate>[1]): boolean {
  if (item.hubId) {
    return hubById(item.hubId).cards.some((card) => passesGate(card, permissions));
  }
  return passesGate(item, permissions);
}

/** Detailseiten und Hub-Ziele halten ihren Bereich in der Leiste markiert. */
export function isNavActive(pathname: string, item: NavItem): boolean {
  if (pathMatches(pathname, item.to)) return true;
  if (!item.hubId) return false;
  return hubById(item.hubId).cards.some((card) => pathMatches(pathname, card.to));
}

export type BreadcrumbCrumb = { to: string; labelKey: string };

/**
 * Brotkrume aus der Nav. Hub-Ziele (`/rechnungen`) haengen nicht am Hub-Pfad,
 * deshalb steht davor der Hub-Name.
 */
export function breadcrumbModel(
  pathname: string,
): { crumbs: BreadcrumbCrumb[]; detail: boolean } | null {
  const top = [...navItems, settingsNavItem].find((item) => pathMatches(pathname, item.to));
  if (top) {
    return {
      crumbs: [{ to: top.to, labelKey: top.labelKey }],
      detail: pathname !== top.to,
    };
  }

  const destination = hubDestinationForPath(pathname);
  if (!destination) return null;

  return {
    crumbs: [
      { to: destination.hub.to, labelKey: destination.hub.titleKey },
      { to: destination.card.to, labelKey: destination.card.titleKey },
    ],
    detail: pathname !== destination.card.to,
  };
}
