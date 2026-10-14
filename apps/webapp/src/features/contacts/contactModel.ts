/**
 * Geschäftspartner und ihre Rollen.
 *
 * Eine Firma oder Person existiert genau einmal (`contacts`). Kunde,
 * Lieferant, Subunternehmer und Sonstiger Kontakt sind Rollen mit eigenen
 * Tabellen; eine Rolle gibt es, wenn ihre Zeile existiert. Ob jemand Kunde
 * oder Lieferant ist, hängt an der Richtung des Geldes, nicht an der
 * Rechtsform — Firma/Person ist deshalb `kind`, keine Rolle.
 *
 * Schema: bautakt-app, Migration 20261014204410_contacts.sql.
 */

export type ContactKind = 'company' | 'person';

export type ContactRole = 'customer' | 'supplier' | 'subcontractor' | 'other';

export const CONTACT_ROLES: readonly ContactRole[] = [
  'customer',
  'supplier',
  'subcontractor',
  'other',
] as const;

/** Funktion eines sonstigen Kontakts (`other_profiles.function`). */
export const OTHER_FUNCTIONS = [
  'architect',
  'planner',
  'structural_engineer',
  'property_manager',
  'authority',
  'other',
] as const;
export type OtherFunction = (typeof OTHER_FUNCTIONS)[number];

/** Länder als ISO-Code (BT-40 der E-Rechnung). */
export const CONTACT_COUNTRIES = ['DE', 'AT', 'CH'] as const;

export type ContactNameFields = {
  kind: string;
  company_name: string;
  first_name: string;
  last_name: string;
};

/** Firma: Firmenname. Person: Vor- und Nachname. */
export function contactDisplayName(contact: ContactNameFields): string {
  const person = [contact.first_name, contact.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  if (contact.kind === 'person') return person;
  return contact.company_name.trim() || person;
}

type RoleProfile = { archived_at: string | null } | null;

/** Die Rollen-Zeilen, so wie sie PostgREST eingebettet liefert (1:1 = Objekt). */
export type ContactRoleRows = {
  customer: RoleProfile;
  supplier: (RoleProfile & { subcontractor: RoleProfile }) | null;
  other: RoleProfile;
};

/**
 * Aktive Rollen eines Kontakts. Archivierte Rollen zählen nicht: wer kein
 * Kunde mehr ist, gehört nicht in den Reiter „Kunden“.
 *
 * Subunternehmer und Lieferant schließen sich in der Anzeige aus — ein
 * Subunternehmer ist ein Kreditor mit Zusatzdaten, kein zusätzlicher Lieferant.
 */
export function activeRoles(rows: ContactRoleRows): ContactRole[] {
  const roles: ContactRole[] = [];
  if (rows.customer && !rows.customer.archived_at) roles.push('customer');
  if (rows.supplier && !rows.supplier.archived_at) {
    const sub = rows.supplier.subcontractor;
    roles.push(sub && !sub.archived_at ? 'subcontractor' : 'supplier');
  }
  if (rows.other && !rows.other.archived_at) roles.push('other');
  return roles;
}

/** Anschrift mehrzeilig für die Detailseite. Leere Teile fallen weg. */
export function formatContactAddress(parts: {
  street: string;
  postalCode: string;
  city: string;
  country?: string;
}): string {
  const cityLine = [parts.postalCode.trim(), parts.city.trim()].filter(Boolean).join(' ');
  const country = parts.country && parts.country !== 'DE' ? parts.country : '';
  return [parts.street.trim(), cityLine, country].filter(Boolean).join('\n');
}

/**
 * Gültigkeit einer §48b-Freistellungsbescheinigung an einem Tag. „Läuft ab“
 * ab 30 Tagen vor Ende — derselbe Vorlauf wie die Benachrichtigung.
 */
export type ExemptionState = 'valid' | 'expiring' | 'expired' | 'missing';

export function exemptionState(
  certificates: readonly { valid_from: string; valid_until: string }[],
  today: string,
): ExemptionState {
  const current = certificates.filter((c) => c.valid_from <= today && c.valid_until >= today);
  if (current.length === 0) {
    return certificates.length === 0 ? 'missing' : 'expired';
  }
  const latestEnd = current
    .map((c) => c.valid_until)
    .sort()
    .at(-1)!;
  const in30 = addDaysIso(today, 30);
  return latestEnd <= in30 ? 'expiring' : 'valid';
}

function addDaysIso(isoDay: string, days: number): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Bauabzugsteuer (§48 EStG): 15 % vom Bruttobetrag, kaufmännisch gerundet. */
export function constructionWithholdingCents(grossCents: number): number {
  return Math.round(grossCents * 0.15);
}

/** IBAN in Vierergruppen, wie sie auf Rechnungen steht. */
export function formatIban(iban: string): string {
  return iban
    .replace(/\s/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/** IBAN ohne Leerzeichen, Großbuchstaben — so steht sie in der Datenbank. */
export function normalizeIban(value: string): string {
  return value.replace(/\s/g, '').toUpperCase();
}

/** Prüfziffer nach ISO 13616 (Modulo 97). */
export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}
