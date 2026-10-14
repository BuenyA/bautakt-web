import type { ContactRole } from './contactModel';

/**
 * Reiter der Kontaktliste. Der Wert steht deutsch in der URL
 * (`/kontakte?rolle=lieferanten`), Default ohne Query ist „Alle“.
 */
export type ContactTab = 'all' | 'customers' | 'suppliers' | 'subcontractors' | 'others';

export const CONTACT_TABS: readonly ContactTab[] = [
  'all',
  'customers',
  'suppliers',
  'subcontractors',
  'others',
] as const;

const TAB_TO_PARAM: Record<Exclude<ContactTab, 'all'>, string> = {
  customers: 'kunden',
  suppliers: 'lieferanten',
  subcontractors: 'subunternehmer',
  others: 'sonstige',
};

const TAB_TO_ROLE: Record<Exclude<ContactTab, 'all'>, ContactRole> = {
  customers: 'customer',
  suppliers: 'supplier',
  subcontractors: 'subcontractor',
  others: 'other',
};

export const contactTabParam = 'rolle';
export const contactArchiveParam = 'archiv';

export function contactTabFromSearch(value: string | null): ContactTab {
  const entry = Object.entries(TAB_TO_PARAM).find(([, param]) => param === value);
  return entry ? (entry[0] as ContactTab) : 'all';
}

export function contactTabToSearch(tab: ContactTab): string | null {
  return tab === 'all' ? null : TAB_TO_PARAM[tab];
}

/** Rolle, die ein Reiter verlangt; `null` für „Alle“. */
export function roleOfTab(tab: ContactTab): ContactRole | null {
  return tab === 'all' ? null : TAB_TO_ROLE[tab];
}

/**
 * Gehört ein Kontakt in den Reiter? Archivierte Kontakte erscheinen nur mit
 * `showArchived`, dann aber unabhängig von ihren (ebenfalls ruhenden) Rollen.
 */
export function matchesContactTab(
  row: { archived_at: string | null; roles: readonly ContactRole[] },
  tab: ContactTab,
  showArchived: boolean,
): boolean {
  if (row.archived_at) return showArchived && tab === 'all';
  if (showArchived) return false;
  const role = roleOfTab(tab);
  return role === null || row.roles.includes(role);
}
