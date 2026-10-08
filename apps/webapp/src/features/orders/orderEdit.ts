/**
 * Bearbeiten eines Auftrags: Formularzustand, Prüfung, Teilpatch.
 *
 * Die Handy-App schreibt seit dem 24.09.2026 nur die Felder, die sich
 * geändert haben, und setzt immer `modified_at`. Ein voller Zeilen-Update
 * würde Status, Summe oder Titelbild aus einem veralteten Formular
 * zurückrollen. Dieselbe Regel gilt hier.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert
 * (Fast Refresh).
 */

/**
 * Länder im Auftragsformular.
 *
 * Die Handy-App hält die Liste als `ALLOWED_COUNTRIES` in `app/lib/utils`.
 * Dieses Repo kann das private Repo nicht lesen. Die Werte sind die
 * deutschsprachigen Ländernamen, die in den Adressen dieses Projekts
 * vorkommen (Aufträge: „Deutschland“; Kunden und Betriebe zusätzlich
 * „Schweiz“), plus Österreich. Standard im Formular ist „Deutschland“.
 * Ein gespeicherter Text außerhalb der Liste bleibt auswählbar.
 *
 * Stand 2026-10-08.
 */
export const ORDER_COUNTRIES = ['Deutschland', 'Österreich', 'Schweiz'] as const;

export const DEFAULT_ORDER_COUNTRY = 'Deutschland';

/** Gespeicherter Auftrag, soweit das Formular ihn braucht. */
export type OrderEditSource = {
  id: string;
  name: string;
  customer_id: string | null;
  customer_label: string;
  cost_center_id: string | null;
  cost_center_label: string;
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
};

export type OrderEditDraft = {
  name: string;
  /** `null`: kein Stammkunde. Die Freitext-Bezeichnung steht dann in `customer_label`. */
  customer_id: string | null;
  customer_label: string;
  /** `null`: keine Kostenstelle. Wird nie als NULL in die Datenbank geschrieben. */
  cost_center_id: string | null;
  cost_center_label: string;
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  /** Leer oder `YYYY-MM-DD`. */
  start_date: string;
  end_date: string;
  description: string;
};

/**
 * Spalten, die ein Speichern schreiben darf.
 *
 * Nie dabei: `status`, `billing_mode`, `contract_sum`, `quote_accepted_at`,
 * `icon`, `cover_image_path`, `company_id`, `created_at`, `id`.
 * `customer_id` und `cost_center_id` sind hier `string`, nie `null`.
 */
export type OrderUpdatePatch = {
  modified_at: string;
  name?: string;
  customer_id?: string;
  customer_label?: string;
  cost_center_id?: string;
  cost_center_label?: string;
  street_address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
};

export type OrderEditIssue = 'name' | 'endBeforeStart';

/** Snapshot der Kostenstelle, wie er in den vorhandenen Zeilen steht: „KS-1000 – Name“. */
export function costCenterOptionLabel(code: string, name: string): string {
  const left = code.trim();
  const right = name.trim();
  if (left && right) return `${left} – ${right}`;
  return left || right;
}

export function orderCountryOptions(current: string): string[] {
  const trimmed = current.trim();
  const known: readonly string[] = ORDER_COUNTRIES;
  if (!trimmed || known.includes(trimmed)) return [...ORDER_COUNTRIES];
  return [trimmed, ...ORDER_COUNTRIES];
}

/** Anzeige im Select. Leeres Land zeigt „Deutschland“, ohne es schon zu schreiben. */
export function displayedCountry(country: string): string {
  const trimmed = country.trim();
  return trimmed || DEFAULT_ORDER_COUNTRY;
}

function dateInput(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function idOrNull(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function draftFromOrder(order: OrderEditSource): OrderEditDraft {
  return {
    name: order.name,
    customer_id: order.customer_id,
    customer_label: order.customer_label,
    cost_center_id: order.cost_center_id,
    cost_center_label: order.cost_center_label,
    street_address: order.street_address,
    postal_code: order.postal_code,
    city: order.city,
    country: order.country,
    start_date: dateInput(order.start_date),
    end_date: dateInput(order.end_date),
    description: order.description,
  };
}

/**
 * Name nicht leer (nach Trim). Ende nicht vor Beginn, wenn beide gesetzt sind.
 * Gleicher Tag ist erlaubt. Ein leeres Datum ist kein Fehler.
 */
export function orderEditIssue(draft: OrderEditDraft): OrderEditIssue | null {
  if (!draft.name.trim()) return 'name';
  const start = draft.start_date.trim();
  const end = draft.end_date.trim();
  if (start && end && end < start) return 'endBeforeStart';
  return null;
}

function putText(
  patch: OrderUpdatePatch,
  key: 'name' | 'street_address' | 'postal_code' | 'city' | 'country' | 'description',
  next: string,
  previous: string,
): boolean {
  const trimmed = next.trim();
  if (trimmed === previous.trim()) return false;
  patch[key] = trimmed;
  return true;
}

/**
 * Teilpatch gegen den Stand, mit dem das Formular geöffnet wurde.
 *
 * `null`, wenn sich nichts geändert hat: dann gibt es keinen Schreibzugriff
 * und `modified_at` wandert nicht. Ist etwas dabei, steht `modified_at` immer
 * mit im Patch. `customer_id` und `customer_label` gehen nur gemeinsam in den
 * Patch, wenn ein Stammkunde neu gewählt wurde. Eine Freitext-Bezeichnung
 * ohne Id geht nur mit, wenn der Text sich geändert hat — die Id bleibt
 * draußen und wird nicht genullt. Dieselbe Regel für die Kostenstelle, nur
 * ohne Freitext: ungeändert heißt beide Spalten fehlen.
 */
export function orderUpdatePatch(
  order: OrderEditSource,
  draft: OrderEditDraft,
  modifiedAt: string,
): OrderUpdatePatch | null {
  const patch: OrderUpdatePatch = { modified_at: modifiedAt };
  let changed = false;

  if (putText(patch, 'name', draft.name, order.name)) changed = true;
  if (putText(patch, 'street_address', draft.street_address, order.street_address)) changed = true;
  if (putText(patch, 'postal_code', draft.postal_code, order.postal_code)) changed = true;
  if (putText(patch, 'city', draft.city, order.city)) changed = true;
  if (putText(patch, 'country', draft.country, order.country)) changed = true;
  if (putText(patch, 'description', draft.description, order.description)) changed = true;

  const nextCustomerId = idOrNull(draft.customer_id);
  const previousCustomerId = idOrNull(order.customer_id);
  if (nextCustomerId && nextCustomerId !== previousCustomerId) {
    patch.customer_id = nextCustomerId;
    patch.customer_label = draft.customer_label.trim();
    changed = true;
  } else if (!nextCustomerId && !previousCustomerId) {
    const label = draft.customer_label.trim();
    if (label !== order.customer_label.trim()) {
      patch.customer_label = label;
      changed = true;
    }
  }

  const nextCostCenterId = idOrNull(draft.cost_center_id);
  const previousCostCenterId = idOrNull(order.cost_center_id);
  if (nextCostCenterId && nextCostCenterId !== previousCostCenterId) {
    patch.cost_center_id = nextCostCenterId;
    patch.cost_center_label = draft.cost_center_label.trim();
    changed = true;
  }

  const start = draft.start_date.trim() || null;
  const end = draft.end_date.trim() || null;
  if (start !== (dateInput(order.start_date) || null)) {
    patch.start_date = start;
    changed = true;
  }
  if (end !== (dateInput(order.end_date) || null)) {
    patch.end_date = end;
    changed = true;
  }

  return changed ? patch : null;
}
