import {
  Box20Filled,
  Box20Regular,
  Briefcase20Filled,
  Briefcase20Regular,
  bundleIcon,
  CalendarLtr20Filled,
  CalendarLtr20Regular,
  Clock20Filled,
  Clock20Regular,
  type FluentIcon,
  Home20Filled,
  Home20Regular,
  People20Filled,
  People20Regular,
  PeopleTeam20Filled,
  PeopleTeam20Regular,
  Person20Filled,
  Person20Regular,
  Settings20Filled,
  Settings20Regular,
  Wallet20Filled,
  Wallet20Regular,
} from '@fluentui/react-icons';

import {
  hubById,
  type HubId,
  passesGate,
  pathMatches,
  type PermissionGate,
} from '@/features/hubs/hubs';
import { routes } from '@/lib/routes';

const Home = bundleIcon(Home20Filled, Home20Regular);
const Briefcase = bundleIcon(Briefcase20Filled, Briefcase20Regular);
const PeopleTeam = bundleIcon(PeopleTeam20Filled, PeopleTeam20Regular);
const Clock = bundleIcon(Clock20Filled, Clock20Regular);
const CalendarLtr = bundleIcon(CalendarLtr20Filled, CalendarLtr20Regular);
const Wallet = bundleIcon(Wallet20Filled, Wallet20Regular);
const Person = bundleIcon(Person20Filled, Person20Regular);
const People = bundleIcon(People20Filled, People20Regular);
const Box = bundleIcon(Box20Filled, Box20Regular);
const Settings = bundleIcon(Settings20Filled, Settings20Regular);

export type NavItem = PermissionGate & {
  to: string;
  labelKey: string;
  /**
   * Fluent-Icon in 20px (Fluents Größe für die Navigation), gefüllt im aktiven
   * Zustand (`bundleIcon`). Ungrößte Icons (`HomeRegular`) erben 14px Schrift.
   */
  icon: FluentIcon;
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
  { to: routes.overview, labelKey: 'common:nav.overview', icon: Home },
  { to: routes.orders, labelKey: 'common:nav.orders', icon: Briefcase },
  { to: routes.assignments, labelKey: 'common:nav.assignments', icon: PeopleTeam },
  { to: routes.times, labelKey: 'common:nav.times', icon: Clock },
  { to: routes.calendar, labelKey: 'common:nav.calendar', icon: CalendarLtr },
  {
    to: routes.financeHub,
    labelKey: 'common:nav.finance',
    icon: Wallet,
    hubId: 'finance',
  },
  {
    to: routes.personalHub,
    labelKey: 'common:nav.employees',
    icon: Person,
    hubId: 'personal',
  },
  {
    to: routes.customers,
    labelKey: 'common:nav.customers',
    icon: People,
    permission: 'canManageCustomers',
  },
  {
    to: routes.materialHub,
    labelKey: 'common:nav.material',
    icon: Box,
    hubId: 'material',
  },
];

/** Unten in der Leiste, abgesetzt vom Rest. Zaehlt als zehnter Punkt. */
export const settingsNavItem: NavItem = {
  to: routes.settings,
  labelKey: 'common:nav.settings',
  icon: Settings,
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
