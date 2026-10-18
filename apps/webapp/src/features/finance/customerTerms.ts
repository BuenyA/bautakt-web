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
 * `integer`), Skonto ein Prozentsatz unter 100. Leer ist erlaubt. Skonto gilt
 * nur mit Prozent und Frist, und die Frist liegt nicht hinter dem Zahlungsziel.
 */
export function invalidTermFields(fields: TermFields): (keyof TermFields)[] {
  const invalid = new Set<keyof TermFields>();
  for (const key of ['paymentTermDays', 'skontoDays'] as const) {
    const value = fields[key].trim();
    if (value && !/^\d{1,4}$/.test(value)) invalid.add(key);
  }
  const percent = fields.skontoPercent.trim();
  const parsedPercent = Number(percent.replace(',', '.'));
  if (percent) {
    if (!/^\d{1,2}([.,]\d{1,2})?$/.test(percent) || !(parsedPercent >= 0 && parsedPercent < 100)) {
      invalid.add('skontoPercent');
    }
  }
  const days = fields.skontoDays.trim();
  const hasPercent = percent !== '' && parsedPercent > 0;
  const hasDays = days !== '' && Number(days) > 0;
  if (hasPercent && !days) invalid.add('skontoDays');
  if (hasDays && !percent) invalid.add('skontoPercent');
  const term = fields.paymentTermDays.trim();
  if (hasDays && term && !invalid.has('paymentTermDays') && Number(days) > Number(term)) {
    invalid.add('skontoDays');
  }
  return (['paymentTermDays', 'skontoPercent', 'skontoDays'] as const).filter((key) =>
    invalid.has(key),
  );
}
