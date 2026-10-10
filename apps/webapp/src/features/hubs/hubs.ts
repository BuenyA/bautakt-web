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
  MoneyRegular,
  PersonAddRegular,
  PersonRegular,
  ReceiptRegular,
  WalletRegular,
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
  descriptionKey: string;
  to: string;
  icon: FluentIcon;
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
  icon: WalletRegular,
  cards: [
    {
      titleKey: 'common:nav.invoices',
      descriptionKey: 'common:hub.finance.invoicesDescription',
      to: routes.invoices,
      icon: DocumentTextRegular,
      anyPermission: ['canUseBillingModule', 'canViewManagementInvoices'],
      featured: true,
    },
    {
      titleKey: 'common:nav.quotes',
      descriptionKey: 'common:hub.finance.quotesDescription',
      to: routes.quotes,
      icon: DocumentEditRegular,
      anyPermission: ['canUseBillingModule', 'canViewManagementInvoices'],
    },
    {
      titleKey: 'common:nav.receivables',
      descriptionKey: 'common:hub.finance.receivablesDescription',
      to: routes.receivables,
      icon: MoneyRegular,
      permission: 'canViewCompanyFinance',
    },
    {
      titleKey: 'common:nav.expenses',
      descriptionKey: 'common:hub.finance.expensesDescription',
      to: routes.expenses,
      icon: ReceiptRegular,
      anyPermission: ['canViewCompanyFinance', 'canManageOverheadCosts'],
    },
    {
      titleKey: 'common:nav.dunning',
      descriptionKey: 'common:hub.finance.dunningDescription',
      to: routes.dunning,
      icon: MegaphoneRegular,
      anyPermission: ['canUseBillingModule', 'canViewCompanyFinance'],
    },
    {
      titleKey: 'common:nav.reports',
      descriptionKey: 'common:hub.finance.reportsDescription',
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
    {
      titleKey: 'common:nav.payroll',
      descriptionKey: 'common:hub.personal.payrollDescription',
      to: routes.payroll,
      icon: WalletRegular,
      anyPermission: ['canViewWageCosts', 'canManageRates'],
    },
    {
      // Die Liste oeffnet das Anlege-Sheet ueber einen Button, nicht ueber
      // eine Query. `?neu=1` gibt es nicht — die Karte zeigt dieselbe Liste.
      titleKey: 'common:hub.personal.addTitle',
      descriptionKey: 'common:hub.personal.addDescription',
      to: routes.employees,
      icon: PersonAddRegular,
      permission: 'canManageEmployees',
      duplicate: true,
    },
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

/** Zielseite hinter einem Hub, fuer die Brotkrume. Die Hub-Seite selbst nicht. */
export function hubDestinationForPath(pathname: string): { hub: Hub; card: HubCard } | null {
  for (const hub of hubs) {
    if (pathMatches(pathname, hub.to)) continue;
    const card = hub.cards.find((item) => !item.duplicate && pathMatches(pathname, item.to));
    if (card) return { hub, card };
  }
  return null;
}
