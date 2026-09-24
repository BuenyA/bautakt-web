/**
 * Formularzustand eines neuen Auftrags.
 *
 * Bewusst getrennt von der Komponente: eine Datei, die neben Komponenten auch
 * Werte exportiert, bricht Fast Refresh
 * (`react-refresh/only-export-components`).
 */
export type OrderDraft = {
  name: string;
  customer_label: string;
  street_address: string;
  postal_code: string;
  city: string;
  description: string;
};

export function emptyOrder(): OrderDraft {
  return {
    name: '',
    customer_label: '',
    street_address: '',
    postal_code: '',
    city: '',
    description: '',
  };
}
