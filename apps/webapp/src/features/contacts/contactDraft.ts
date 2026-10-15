import type { ContactKind, ContactRole, OtherFunction } from './contactModel';

/**
 * Formularzustand eines Kontakts samt Rollendaten.
 *
 * Bewusst getrennt von der Komponente: eine Datei, die neben Komponenten auch
 * Werte exportiert, bricht Fast Refresh
 * (`react-refresh/only-export-components`).
 *
 * Zahlen stehen als Text im Entwurf, weil ein leeres Eingabefeld etwas anderes
 * ist als 0 (kein Zahlungsziel ≠ sofort fällig).
 */
export type ContactDraft = {
  id?: string;
  kind: ContactKind;
  company_name: string;
  salutation: string;
  first_name: string;
  last_name: string;
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  vat_id: string;
  tax_number: string;
  notes: string;
  /** Rollen, die der Kontakt nach dem Speichern hat (neue werden angelegt). */
  roles: ContactRole[];
  /** Rollen, die schon in der Datenbank stehen — die entfernt das Formular nicht. */
  existingRoles: ContactRole[];
  customer: {
    customer_number: string;
    buyer_reference: string;
    payment_term_days: string;
    discount_percent: string;
    discount_days: string;
    is_construction_business: boolean;
    tax_exemption_valid_until: string;
    billing_street: string;
    billing_postal_code: string;
    billing_city: string;
    billing_country: string;
  };
  supplier: {
    supplier_number: string;
    our_customer_number: string;
    payment_term_days: string;
    discount_percent: string;
    discount_days: string;
    default_cost_category_id: string;
  };
  subcontractor: {
    trade: string;
    reverse_charge_13b: boolean;
  };
  other: {
    function: OtherFunction;
  };
};

export function emptyContact(role: ContactRole | null = null): ContactDraft {
  return {
    kind: 'company',
    company_name: '',
    salutation: '',
    first_name: '',
    last_name: '',
    street_address: '',
    postal_code: '',
    city: '',
    country: 'DE',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    vat_id: '',
    tax_number: '',
    notes: '',
    roles: role ? withRole([], role) : [],
    existingRoles: [],
    customer: {
      customer_number: '',
      buyer_reference: '',
      payment_term_days: '',
      discount_percent: '',
      discount_days: '',
      is_construction_business: false,
      tax_exemption_valid_until: '',
      billing_street: '',
      billing_postal_code: '',
      billing_city: '',
      billing_country: '',
    },
    supplier: {
      supplier_number: '',
      our_customer_number: '',
      payment_term_days: '',
      discount_percent: '',
      discount_days: '',
      default_cost_category_id: '',
    },
    subcontractor: { trade: '', reverse_charge_13b: true },
    other: { function: 'other' },
  };
}

/**
 * Rolle hinzufügen. Subunternehmer setzt die Lieferantendaten voraus (Kreditor
 * mit Zusatzdaten), bringt den Lieferanten deshalb mit.
 */
export function withRole(roles: readonly ContactRole[], role: ContactRole): ContactRole[] {
  const next = new Set(roles);
  next.add(role);
  if (role === 'subcontractor') next.add('supplier');
  return [...next];
}

/** Rolle abwählen. Ohne Lieferant gibt es keinen Subunternehmer. */
export function withoutRole(roles: readonly ContactRole[], role: ContactRole): ContactRole[] {
  return roles.filter((r) => r !== role && !(role === 'supplier' && r === 'subcontractor'));
}

const text = (value: string | null | undefined) => value ?? '';
const numberText = (value: number | null | undefined) => (value == null ? '' : String(value));

/** Geladener Kontakt → Formular. */
export function draftFromContact(contact: ContactDetail): ContactDraft {
  const base = emptyContact();
  const roles: ContactRole[] = [];
  if (contact.customer) roles.push('customer');
  if (contact.supplier) roles.push('supplier');
  if (contact.supplier?.subcontractor) roles.push('subcontractor');
  if (contact.other) roles.push('other');

  return {
    id: contact.id,
    kind: contact.kind === 'person' ? 'person' : 'company',
    company_name: contact.company_name,
    salutation: contact.salutation,
    first_name: contact.first_name,
    last_name: contact.last_name,
    street_address: contact.street_address,
    postal_code: contact.postal_code,
    city: contact.city,
    country: contact.country || 'DE',
    email: contact.email,
    phone: contact.phone,
    mobile: contact.mobile,
    website: contact.website,
    vat_id: contact.vat_id,
    tax_number: contact.tax_number,
    notes: contact.notes,
    roles,
    existingRoles: [...roles],
    customer: contact.customer
      ? {
          customer_number: contact.customer.customer_number,
          buyer_reference: contact.customer.buyer_reference,
          payment_term_days: numberText(contact.customer.payment_term_days),
          discount_percent: numberText(contact.customer.discount_percent),
          discount_days: numberText(contact.customer.discount_days),
          is_construction_business: contact.customer.is_construction_business,
          tax_exemption_valid_until: text(contact.customer.tax_exemption_valid_until),
          billing_street: contact.customer.billing_street,
          billing_postal_code: contact.customer.billing_postal_code,
          billing_city: contact.customer.billing_city,
          billing_country: contact.customer.billing_country,
        }
      : base.customer,
    supplier: contact.supplier
      ? {
          supplier_number: contact.supplier.supplier_number,
          our_customer_number: contact.supplier.our_customer_number,
          payment_term_days: numberText(contact.supplier.payment_term_days),
          discount_percent: numberText(contact.supplier.discount_percent),
          discount_days: numberText(contact.supplier.discount_days),
          default_cost_category_id: text(contact.supplier.default_cost_category_id),
        }
      : base.supplier,
    subcontractor: contact.supplier?.subcontractor
      ? {
          trade: contact.supplier.subcontractor.trade,
          reverse_charge_13b: contact.supplier.subcontractor.reverse_charge_13b,
        }
      : base.subcontractor,
    other: contact.other ? { function: contact.other.function as OtherFunction } : base.other,
  };
}

/** Ganzzahl oder null; ungültige Eingaben fängt die Prüfung im Formular. */
export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN;
}

/** Dezimalzahl mit Komma oder Punkt, oder null. */
export function parseOptionalDecimal(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

/**
 * Nur die Felder, die sich geändert haben. Teil-Updates verhindern, dass ein
 * Formular mit veralteten Werten fremde Änderungen überschreibt (in der
 * Handy-App ist genau das passiert: Speichern setzte Finanzfelder zurück).
 */
export function changedFields<T extends Record<string, unknown>>(before: T, after: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (before[key] !== after[key]) patch[key] = after[key];
  }
  return patch;
}

/** Kontakt, wie ihn `useContact` liefert. */
export type ContactDetail = {
  id: string;
  kind: string;
  company_name: string;
  salutation: string;
  first_name: string;
  last_name: string;
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  vat_id: string;
  tax_number: string;
  notes: string;
  archived_at: string | null;
  created_at: string;
  customer: {
    customer_number: string;
    buyer_reference: string;
    payment_term_days: number | null;
    discount_percent: number | null;
    discount_days: number | null;
    is_construction_business: boolean;
    tax_exemption_valid_until: string | null;
    billing_street: string;
    billing_postal_code: string;
    billing_city: string;
    billing_country: string;
    archived_at: string | null;
  } | null;
  supplier: {
    supplier_number: string;
    our_customer_number: string;
    payment_term_days: number | null;
    discount_percent: number | null;
    discount_days: number | null;
    default_cost_category_id: string | null;
    archived_at: string | null;
    subcontractor: {
      trade: string;
      reverse_charge_13b: boolean;
      archived_at: string | null;
    } | null;
  } | null;
  other: {
    function: string;
    archived_at: string | null;
  } | null;
};

/**
 * Steht im zugeklappten Bereich „Weitere Angaben“ schon etwas? Dann öffnet das
 * Formular ihn gleich — versteckte Werte, die man nicht sieht, ändert niemand
 * bewusst. Kunden- und Lieferantennummer zählen nicht: die vergibt der
 * Nummernkreis, sie stünden sonst bei jedem gespeicherten Kontakt.
 */
export function hasOptionalValues(draft: ContactDraft): boolean {
  const filled = (...values: string[]) => values.some((value) => value.trim() !== '');
  const has = (role: ContactRole) => draft.roles.includes(role);
  if (
    filled(draft.salutation, draft.mobile, draft.website, draft.vat_id, draft.tax_number) ||
    filled(draft.notes) ||
    (draft.kind === 'company' && filled(draft.first_name, draft.last_name)) ||
    (draft.country !== '' && draft.country !== 'DE')
  ) {
    return true;
  }
  if (has('customer')) {
    const c = draft.customer;
    if (
      c.is_construction_business ||
      filled(c.buyer_reference, c.payment_term_days, c.discount_percent, c.discount_days) ||
      filled(c.billing_street)
    ) {
      return true;
    }
  }
  if (has('supplier')) {
    const s = draft.supplier;
    if (
      filled(s.our_customer_number, s.payment_term_days, s.discount_percent, s.discount_days) ||
      filled(s.default_cost_category_id)
    ) {
      return true;
    }
  }
  return false;
}
