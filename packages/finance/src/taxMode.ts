/**
 * Steuerart eines Ausgangsbelegs (`sales_documents.tax_mode`).
 *
 * Die Pflichthinweise sind wortgleich mit dem PDF-Renderer
 * (`finance-document-render/mapping.ts`, `buildTaxHintTexts`), der sie aus
 * `tax_mode` selbst auf den Beleg setzt. Der Editor zeigt sie nur an, damit
 * man vor dem Festschreiben sieht, was auf der Rechnung stehen wird — in den
 * Schlusstext gehören sie nicht, sonst stehen sie doppelt auf dem PDF.
 */
export const TAX_MODES = ['standard', 'reverse_charge', 'tax_free', 'small_business'] as const;
export type TaxMode = (typeof TAX_MODES)[number];

export function toTaxMode(value: string | null | undefined): TaxMode {
  return (TAX_MODES as readonly string[]).includes(value ?? '') ? (value as TaxMode) : 'standard';
}

/** Ohne Umsatzsteuer: jeder Modus außer `standard` rechnet mit 0 %. */
export function taxModeChargesVat(mode: TaxMode): boolean {
  return mode === 'standard';
}

/** Pflichthinweis auf dem Beleg; `null`, wenn keiner nötig ist. */
export function taxModeNotice(mode: TaxMode, country = 'DE'): string | null {
  const isAustria = country.trim().toUpperCase() === 'AT';
  switch (mode) {
    case 'reverse_charge':
      return isAustria
        ? 'Übergang der Steuerschuld gemäß § 19 Abs. 1a UStG.'
        : 'Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG.';
    case 'small_business':
      return isAustria
        ? 'Umsatzsteuerfreie Leistung gemäß § 6 Abs. 1 Z 27 UStG (Kleinunternehmerregelung).'
        : 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.';
    case 'tax_free':
      return 'Steuerfreie Leistung.';
    default:
      return null;
  }
}
