/**
 * Ungespeicherten Editor-Stand prüfen und in Zeilenform bringen.
 *
 * Gemeinsamer Kern (bautakt-web#160): die Edge Function nimmt damit
 * `{ draft }` an, die Live-Vorschau im Browser bringt ihr Formular durch
 * dieselbe Funktion, bevor `render.ts` rendert. Nur so sehen beide dieselbe
 * Eingabe.
 */

import type { SalesDocRow, SalesLineRow } from "./mapping.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Schutz vor uebergrossen Vorschau-Anfragen; echte Belege liegen weit darunter. */
const MAX_DRAFT_LINES = 500;

export type DraftInput = { doc: SalesDocRow; lines: SalesLineRow[] };

export class InvalidDraftError extends Error {}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(value: unknown): string | null {
  return typeof value === "string" && ISO_DATE_RE.test(value) ? value : null;
}

/**
 * Ungespeicherten Editor-Stand in die Zeilenform bringen, die sonst aus der
 * Datenbank kaeme. Nur bekannte Felder, alles Uebrige faellt weg. Status ist
 * immer `draft`: ein Entwurf hat keine Nummer und keine Kaeuferkopie, er
 * nimmt den Kunden live aus dem Kontakt (`resolveBuyer`).
 */
export function parseDraftInput(value: unknown): DraftInput | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") throw new InvalidDraftError("draft must be an object");
  const raw = value as { document?: unknown; lines?: unknown };
  const d = (raw.document ?? {}) as Record<string, unknown>;
  const companyId = String(d.company_id ?? "");
  if (!UUID_RE.test(companyId)) throw new InvalidDraftError("draft.document.company_id required");
  const customerId = d.customer_id == null ? null : String(d.customer_id);
  if (customerId !== null && !UUID_RE.test(customerId)) {
    throw new InvalidDraftError("draft.document.customer_id invalid");
  }
  const type = String(d.type ?? "");
  if (!type) throw new InvalidDraftError("draft.document.type required");
  const id = typeof d.id === "string" && UUID_RE.test(d.id) ? d.id : crypto.randomUUID();

  const doc: SalesDocRow = {
    id,
    company_id: companyId,
    type,
    status: "draft",
    document_number: null,
    customer_id: customerId,
    // Gutschrift: Bezug für BT-25 und den Verrechnungstext (bautakt-web#78).
    parent_document_id: typeof d.parent_document_id === "string" &&
        UUID_RE.test(d.parent_document_id)
      ? d.parent_document_id
      : null,
    buyer_reference: textOrNull(d.buyer_reference),
    issue_date: dateOrNull(d.issue_date),
    service_date: dateOrNull(d.service_date),
    due_date: dateOrNull(d.due_date),
    tax_mode: textOrNull(d.tax_mode),
    currency: textOrNull(d.currency),
    net_total: numberOrNull(d.net_total),
    vat_total: numberOrNull(d.vat_total),
    gross_total: numberOrNull(d.gross_total),
    labor_share: numberOrNull(d.labor_share),
    skonto_percent: numberOrNull(d.skonto_percent),
    skonto_days: numberOrNull(d.skonto_days),
    payment_term_days: numberOrNull(d.payment_term_days),
    notes: textOrNull(d.notes),
    intro_text: textOrNull(d.intro_text),
    footer_text: textOrNull(d.footer_text),
    created_at: new Date().toISOString(),
    e_invoice: d.e_invoice !== false,
    einvoice_format: d.einvoice_format === "xrechnung" ? "xrechnung" : "zugferd",
    storage_path: null,
    content_hash: null,
    buyer_name: null,
    buyer_street: null,
    buyer_postal_code: null,
    buyer_city: null,
    buyer_country: null,
    buyer_vat_id: null,
    buyer_customer_number: null,
    buyer_email: null,
    buyer_contact_name: null,
  };

  const rawLines = Array.isArray(raw.lines) ? raw.lines : [];
  if (rawLines.length > MAX_DRAFT_LINES) throw new InvalidDraftError("too many lines");
  const lines: SalesLineRow[] = rawLines.map((entry, index) => {
    const l = (entry ?? {}) as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      sort_order: numberOrNull(l.sort_order) ?? index,
      kind: textOrNull(l.kind),
      title: textOrNull(l.title),
      description: textOrNull(l.description),
      quantity: numberOrNull(l.quantity),
      unit: textOrNull(l.unit),
      unit_price: numberOrNull(l.unit_price),
      discount_percent: numberOrNull(l.discount_percent),
      tax_rate_percent: numberOrNull(l.tax_rate_percent),
      tax_category: textOrNull(l.tax_category),
      net_amount: numberOrNull(l.net_amount),
      // Nur für BT-25; geladen wird der Abschlag ausschliesslich im Betrieb
      // des Entwurfs (loadDocumentBundle).
      credited_document_id: typeof l.credited_document_id === "string" &&
          UUID_RE.test(l.credited_document_id)
        ? l.credited_document_id
        : null,
    };
  });
  lines.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return { doc, lines };
}
