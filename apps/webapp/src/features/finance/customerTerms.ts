/** Konditionen aus dem Kundenprofil (`customer_profiles`). */
export type CustomerTerms = {
  buyer_reference: string;
  payment_term_days: number | null;
  discount_percent: number | null;
  discount_days: number | null;
};

/** Die Konditionsfelder des Rechnungseditors, als Rohtext wie im Formular. */
export type TermFields = {
  buyerReference: string;
  paymentTermDays: string;
  skontoPercent: string;
  skontoDays: string;
};

function numberText(value: number | null): string {
  return value == null ? '' : String(value).replace('.', ',');
}

/** Was ein Kunde in die Felder schreiben wuerde. */
export function termFieldsFromCustomer(terms: CustomerTerms | null): TermFields {
  return {
    buyerReference: terms?.buyer_reference.trim() ?? '',
    paymentTermDays: numberText(terms?.payment_term_days ?? null),
    skontoPercent: numberText(terms?.discount_percent ?? null),
    skontoDays: numberText(terms?.discount_days ?? null),
  };
}

/**
 * Konditionen des gewaehlten Kunden in die Felder uebernehmen.
 *
 * Nur leere Felder werden gefuellt — und solche, die noch genau den Wert des
 * vorher gewaehlten Kunden tragen. Sonst bliebe beim Kundenwechsel die
 * Leitweg-ID des falschen Kunden stehen. Was der Nutzer selbst eingetippt hat,
 * gewinnt immer.
 */
export function prefillCustomerTerms<T extends TermFields>(
  fields: T,
  next: CustomerTerms | null,
  previous: CustomerTerms | null,
): T {
  const incoming = termFieldsFromCustomer(next);
  const outgoing = termFieldsFromCustomer(previous);
  const result = { ...fields };
  for (const key of Object.keys(incoming) as (keyof TermFields)[]) {
    const current = fields[key].trim();
    if (current === '' || current === outgoing[key]) result[key] = incoming[key] as T[typeof key];
  }
  return result;
}

/**
 * Felder, die sich nicht speichern lassen: Tage sind ganze Zahlen (Spalte
 * `integer`), Skonto ein Prozentsatz unter 100. Leer ist erlaubt.
 */
export function invalidTermFields(fields: TermFields): (keyof TermFields)[] {
  const invalid: (keyof TermFields)[] = [];
  for (const key of ['paymentTermDays', 'skontoDays'] as const) {
    const value = fields[key].trim();
    if (value && !/^\d{1,4}$/.test(value)) invalid.push(key);
  }
  const percent = fields.skontoPercent.trim();
  if (percent) {
    const parsed = Number(percent.replace(',', '.'));
    if (!/^\d{1,2}([.,]\d{1,2})?$/.test(percent) || !(parsed >= 0 && parsed < 100)) {
      invalid.push('skontoPercent');
    }
  }
  return invalid;
}
