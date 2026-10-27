/**
 * Reine Hilfen für „Per E-Mail versenden“ (#186): Empfänger lesen, Anhang
 * benennen. Ohne React und Supabase, damit sie mit `node --test` laufen.
 * Die Fußzeile baut der Mail-Adapter; die Vorschau zeigt sein HTML.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mehrere Empfänger durch Komma, Semikolon oder Leerzeichen getrennt. */
export function parseRecipients(input: string): { valid: string[]; invalid: string[] } {
  const parts = input
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const unique = [...new Set(parts.map((part) => part.toLowerCase()))];
  return {
    valid: unique.filter((part) => EMAIL.test(part)),
    invalid: unique.filter((part) => !EMAIL.test(part)),
  };
}

/**
 * Was der Kunde im Anhang bekommt: bei XRechnung das eingebettete XML
 * (öffentliche Auftraggeber verarbeiten nur das), sonst das Archiv-PDF.
 */
export function attachmentFileName(
  baseName: string,
  document: { e_invoice: boolean; einvoice_format: string },
): string {
  return document.e_invoice && document.einvoice_format === 'xrechnung'
    ? `${baseName}.xml`
    : `${baseName}.pdf`;
}
