import type { ContactRole } from './contactModel';

/**
 * Reiter der Kontaktliste. Der Wert steht deutsch in der URL
 * (`/kontakte?rolle=lieferanten`), Default ohne Query ist „Kunden“. Einen
 * Reiter „Alle“ gibt es bewusst nicht — ein Kontakt mit mehreren Rollen steht
 * in jedem seiner Reiter.
 */
export type ContactTab = 'customers' | 'suppliers' | 'subcontractors' | 'others';

export const CONTACT_TABS: readonly ContactTab[] = [
  'customers',
  'suppliers',
  'subcontractors',
  'others',
] as const;

export const DEFAULT_CONTACT_TAB: ContactTab = 'customers';

const TAB_TO_PARAM: Record<ContactTab, string> = {
  customers: 'kunden',
  suppliers: 'lieferanten',
  subcontractors: 'subunternehmer',
  others: 'sonstige',
};

const TAB_TO_ROLE: Record<ContactTab, ContactRole> = {
  customers: 'customer',
  suppliers: 'supplier',
  subcontractors: 'subcontractor',
  others: 'other',
};

export const contactTabParam = 'rolle';
export const contactArchiveParam = 'archiv';

export function contactTabFromSearch(value: string | null): ContactTab {
  const entry = Object.entries(TAB_TO_PARAM).find(([, param]) => param === value);
  return entry ? (entry[0] as ContactTab) : DEFAULT_CONTACT_TAB;
}

export function contactTabToSearch(tab: ContactTab): string | null {
  return tab === DEFAULT_CONTACT_TAB ? null : TAB_TO_PARAM[tab];
}

/** Rolle, die ein Reiter verlangt. */
export function roleOfTab(tab: ContactTab): ContactRole {
  return TAB_TO_ROLE[tab];
}

/**
 * Gehört ein Kontakt in den Reiter? Archivierte Kontakte erscheinen nur mit
 * `showArchived`, dann aber unabhängig vom Reiter — ihre Rollen ruhen ebenfalls.
 */
export function matchesContactTab(
  row: { archived_at: string | null; roles: readonly ContactRole[] },
  tab: ContactTab,
  showArchived: boolean,
): boolean {
  if (row.archived_at) return showArchived;
  if (showArchived) return false;
  return row.roles.includes(roleOfTab(tab));
}
