import type { InvoiceData } from "./types.ts";

/**
 * Fingerabdruck des Belegs, wie er gerendert wird (bautakt-web#217).
 *
 * Grundlage ist die Render-Eingabe (`InvoiceData`), nicht das PDF: die Bytes
 * tragen Zeitstempel und unterscheiden sich bei jedem Lauf. Gleicher
 * Fingerabdruck heisst gleicher Inhalt — Kopf, Käufer, Verkäufer,
 * Positionen, Summen, Bedingungen und Texte.
 *
 * Ausgenommen ist nur, was sich beim Festschreiben zwangslaeufig aendert:
 * die Nummer (`documentNumber`, `isDraft`), die Beleg-Id (ein ungespeicherter
 * Entwurf hat noch keine) und die Warnungen an den Aufrufer. Das
 * Ausstellungsdatum zaehlt mit: ein Entwurf ohne Datum zeigt bereits das
 * heutige, das `finalize_sales_document` setzt.
 *
 * Das Logo steht nicht in `InvoiceData`, praegt aber das PDF; deshalb geht
 * sein Pfad (`companies.logo_image_url`) mit ein.
 */
export async function invoiceFingerprint(
  data: InvoiceData,
  logoPath: string | null,
): Promise<string> {
  const {
    documentId: _documentId,
    documentNumber: _documentNumber,
    isDraft: _isDraft,
    warnings: _warnings,
    ...content
  } = data;
  const bytes = new TextEncoder().encode(canonicalJson({ ...content, logoPath }));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** JSON mit sortierten Schlüsseln, damit die Reihenfolge der Felder keine Rolle spielt. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
