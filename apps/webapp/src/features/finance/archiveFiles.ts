import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Belegarten mit E-Rechnung: nur deren Original trägt ein `factur-x.xml`
 * (gleiche Liste wie `isInvoiceLike` in `finance-document-render`).
 */
export const E_INVOICE_TYPES = [
  'invoice',
  'partial_invoice',
  'final_invoice',
  'credit_note',
  'cancellation',
] as const;

export function hasEInvoice(type: string): boolean {
  return (E_INVOICE_TYPES as readonly string[]).includes(type);
}

/** Ausgangsbeleg mit E-Rechnung: passende Belegart und nicht abgewählt. */
export function isEInvoiceDocument(document: { type: string; e_invoice?: boolean | null }) {
  return hasEInvoice(document.type) && document.e_invoice !== false;
}

/** Eingangsrechnung, die als ZUGFeRD oder XRechnung ankam. */
export function isEInvoiceIncoming(invoice: { source_format?: string | null }) {
  return invoice.source_format === 'zugferd' || invoice.source_format === 'xrechnung';
}

const UMLAUTS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'Ae',
  Ö: 'Oe',
  Ü: 'Ue',
  ß: 'ss',
};

/** Dateisicher: Umlaute ausschreiben, alles außer Buchstaben/Ziffern wird `-`. */
function fileSafe(value: string): string {
  return value
    .replace(/[äöüÄÖÜß]/g, (char) => UMLAUTS[char] ?? char)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/** Sprechender Dateiname ohne Endung: `RE00002_Aurain-GmbH`. */
export function documentFileBaseName(documentNumber: string | null, customerLabel: string): string {
  return [fileSafe(documentNumber ?? '') || 'Beleg', fileSafe(customerLabel)]
    .filter(Boolean)
    .join('_');
}

export function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([bytes.slice()], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Erst nach dem Klick freigeben; der Browser hat die Datei dann übernommen.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Name des eingebetteten XML: ZUGFeRD `factur-x.xml`, XRechnung `xrechnung.xml` (#184). */
const EMBEDDED_XML_NAMES = new Set(['factur-x.xml', 'xrechnung.xml']);

/**
 * Das eingebettete XML (`factur-x.xml` bzw. `xrechnung.xml`) aus dem
 * Archiv-Original lesen. Bei einer XRechnung ist es das Original, das der
 * Auftraggeber bekommt; das PDF ist nur Sichtbeleg.
 *
 * Bewusst aus dem PDF und nicht neu erzeugt: Das XML im Original ist die
 * E-Rechnung, die der Kunde bekommt — ein neu gerendertes XML könnte davon
 * abweichen (Leitplanke L2). `null`, wenn das PDF keinen Anhang trägt.
 */
export async function extractFacturX(pdf: Uint8Array): Promise<Uint8Array | null> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const task = pdfjs.getDocument({ data: pdf.slice() });
  try {
    const doc = await task.promise;
    const attachments = await doc.getAttachments();
    if (!attachments) return null;
    for (const [id, attachment] of attachments) {
      if (!EMBEDDED_XML_NAMES.has(attachment.filename.toLowerCase())) continue;
      return attachment.content ?? (await doc.getAttachmentContent(id));
    }
    return null;
  } finally {
    await task.destroy();
  }
}
