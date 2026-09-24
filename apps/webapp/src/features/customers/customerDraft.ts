/**
 * Formularzustand eines Kunden.
 *
 * Bewusst getrennt von der Komponente: eine Datei, die neben Komponenten auch
 * Werte exportiert, bricht Fast Refresh
 * (`react-refresh/only-export-components`).
 */
export type CustomerDraft = {
  id?: string;
  customer_type: 'b2b' | 'b2c';
  company_name: string;
  first_name: string;
  last_name: string;
  customer_number: string;
  email: string;
  phone: string;
  street_address: string;
  postal_code: string;
  city: string;
  notes: string;
};

export function emptyCustomer(): CustomerDraft {
  return {
    customer_type: 'b2b',
    company_name: '',
    first_name: '',
    last_name: '',
    customer_number: '',
    email: '',
    phone: '',
    street_address: '',
    postal_code: '',
    city: '',
    notes: '',
  };
}

/** Aus einem geladenen Kunden einen Formularzustand machen. */
export function draftFromCustomer(row: {
  id: string;
  customer_type: string;
  company_name: string;
  first_name: string;
  last_name: string;
  customer_number: string | null;
  email: string;
  phone: string;
  street_address?: string;
  postal_code?: string;
  city: string;
  notes?: string;
}): CustomerDraft {
  return {
    id: row.id,
    customer_type: row.customer_type === 'b2c' ? 'b2c' : 'b2b',
    company_name: row.company_name,
    first_name: row.first_name,
    last_name: row.last_name,
    customer_number: row.customer_number ?? '',
    email: row.email,
    phone: row.phone,
    street_address: row.street_address ?? '',
    postal_code: row.postal_code ?? '',
    city: row.city,
    notes: row.notes ?? '',
  };
}
