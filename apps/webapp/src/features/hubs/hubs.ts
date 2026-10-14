import { hasPermission, type PermissionKey } from '@bautakt/core';
import {
  BeachRegular,
  BoxMultipleRegular,
  BoxRegular,
  DataHistogramRegular,
  DocumentEditRegular,
  DocumentTextRegular,
  type FluentIcon,
  LayerRegular,
  MegaphoneRegular,
  PersonRegular,
  ReceiptRegular,
} from '@fluentui/react-icons';

import { routes } from '@/lib/routes';

export type HubId = 'finance' | 'personal' | 'material';

export type PermissionGate = {
  permission?: PermissionKey;
  /** Mehrere Rechte: eines genuegt. */
  anyPermission?: PermissionKey[];
};

export type HubCard = PermissionGate & {
  titleKey: string;
  /** Untertitel der Kachel; Reiter (Rechnungen) brauchen keinen. */
  descriptionKey?: string;
  to: string;
  icon: FluentIcon;
  /** Weitere Pfade, die diesen Eintrag aktiv markieren. */
  alsoMatches?: string[];
  /** Erste Zelle, Primary-Ring, zwei Spalten ab `sm`. Nur Rechnungen. */
  featured?: boolean;
  /**
   * Gleicher Pfad wie eine andere Karte. Zaehlt fuer die Sichtbarkeit,
   * nicht als eigene Brotkrume.
   */
  duplicate?: boolean;
};

export type Hub = {
  id: HubId;
  to: string;
  titleKey: string;
  descriptionKey: string;
  icon: FluentIcon;
  cards: HubCard[];
};

/**
 * Recht einer Karte oder eines direkten Nav-Punkts.
 *
 * ⚠️ Ausblenden ist Fuehrung, keine Kontrolle. Die Route bleibt aufrufbar;
 * RLS und die `enforce_*`-Trigger sagen Nein.
 */
export function passesGate(
  item: PermissionGate,
  permissions: Parameters<typeof hasPermission>[0],
): boolean {
  if (item.permission && !hasPermission(permissions, item.permission)) return false;
  if (item.anyPermission && !item.anyPermission.some((key) => hasPermission(permissions, key))) {
    return false;
  }
  return true;
}

export function pathMatches(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * Hub-Landings. Die Karten verlinken bestehende Listen — keine neuen Module.
 * Rechte sind die der frueheren Sidebar-Eintraege.
 */
export const financeHub: Hub = {
  id: 'finance',
  to: routes.financeHub,
  titleKey: 'common:nav.finance',
  descriptionKey: 'common:hub.finance.description',
  icon: DocumentTextRegular,
  // Kein Kachel-Hub mehr: `/finanzen` ist die Rechnungs-Übersicht, und diese
  // Liste sind ihre Reiter (`FinanceTabs`). Die Übersicht selbst steht dort
  // vorn und zählt hier nicht — sie allein soll den Leistenpunkt nicht zeigen.
  cards: [
    {
      titleKey: 'common:hub.finance.tabs.outgoing',
      to: routes.invoices,
      icon: DocumentTextRegular,
      anyPermission: ['canUseBillingModule', 'canViewManagementInvoices'],
      // Offene Posten ist kein eigener Reiter mehr; die Seite bleibt und
      // gehört zu den Ausgangsrechnungen.
      alsoMatches: [routes.receivables],
    },
    {
      titleKey: 'common:hub.finance.tabs.incoming',
      to: routes.expenses,
      icon: ReceiptRegular,
      anyPermission: ['canViewCompanyFinance', 'canManageOverheadCosts'],
    },
    {
      titleKey: 'common:hub.finance.tabs.quotes',
      to: routes.quotes,
      icon: DocumentEditRegular,
      anyPermission: ['canUseBillingModule', 'canViewManagementInvoices'],
    },
    {
      titleKey: 'common:hub.finance.tabs.dunning',
      to: routes.dunning,
      icon: MegaphoneRegular,
      anyPermission: ['canUseBillingModule', 'canViewCompanyFinance'],
    },
    {
      titleKey: 'common:hub.finance.tabs.reports',
      to: routes.reports,
      icon: DataHistogramRegular,
      permission: 'canViewCompanyFinance',
    },
  ],
};

export const personalHub: Hub = {
  id: 'personal',
  to: routes.personalHub,
  titleKey: 'common:nav.employees',
  descriptionKey: 'common:hub.personal.description',
  icon: PersonRegular,
  cards: [
    {
      titleKey: 'common:hub.personal.directoryTitle',
      descriptionKey: 'common:hub.personal.directoryDescription',
      to: routes.employees,
      icon: PersonRegular,
      permission: 'canManageEmployees',
    },
    {
      titleKey: 'common:nav.absences',
      descriptionKey: 'common:hub.personal.absencesDescription',
      to: routes.absences,
      icon: BeachRegular,
      permission: 'canManageAbsences',
    },
    // „Mitarbeiter hinzufügen“ führte auf dieselbe Liste wie das Verzeichnis
    // und ist deshalb weg (anlegen: Knopf in der Liste oder `?neu=1`).
    // „Lohn“ (`routes.payroll`) ist hier bewusst nicht mehr verlinkt: es geht
    // um Sätze des Betriebs, nicht um einzelne Mitarbeiter. Die Seite zieht
    // später unter die Unternehmenseinstellungen (Owner, 2026-10-11).
  ],
};

export const materialHub: Hub = {
  id: 'material',
  to: routes.materialHub,
  titleKey: 'common:nav.material',
  descriptionKey: 'common:hub.material.description',
  icon: BoxMultipleRegular,
  cards: [
    {
      titleKey: 'common:nav.catalog',
      descriptionKey: 'common:hub.material.catalogDescription',
      to: routes.catalog,
      icon: BoxRegular,
      permission: 'canManageCatalog',
    },
    {
      titleKey: 'common:nav.costCenters',
      descriptionKey: 'common:hub.material.costCentersDescription',
      to: routes.costCenters,
      icon: LayerRegular,
      permission: 'canManageCostCenters',
    },
  ],
};

const hubsById: Record<HubId, Hub> = {
  finance: financeHub,
  personal: personalHub,
  material: materialHub,
};

export const hubs: Hub[] = [financeHub, personalHub, materialHub];

export function hubById(id: HubId): Hub {
  return hubsById[id];
}

export function visibleHubCards(
  hub: Hub,
  permissions: Parameters<typeof hasPermission>[0],
): HubCard[] {
  return hub.cards.filter((card) => passesGate(card, permissions));
}

/** Pfad gehört zu diesem Eintrag — selbst oder über `alsoMatches`. */
export function cardMatches(pathname: string, card: HubCard): boolean {
  return [card.to, ...(card.alsoMatches ?? [])].some((to) => pathMatches(pathname, to));
}
