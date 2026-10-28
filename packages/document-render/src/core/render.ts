/**
 * Render-Ablauf ohne Datenbank: aus Beleg, Positionen und Bündel wird
 * InvoiceData, Fingerabdruck, XML und PDF.
 *
 * Gemeinsamer Kern für die Edge Function und die Live-Vorschau im Browser
 * (bautakt-web#160). Die Function lädt das Bündel per Service Role und ruft
 * genau diese beiden Schritte auf; der Browser bekommt dasselbe Bündel
 * (`bundle_only`) und rendert damit im Web Worker. Deshalb steht hier nichts,
 * was nur eine Seite kann: kein Deno, kein DOM, kein Supabase-Client.
 *
 * In bautakt-web liegt eine Kopie unter `packages/document-render` (Abgleich
 * per Skript, Golden-Files aus `tools/einvoice-validation/golden.ts`).
 */

import { loadPdfAssets } from "./assets.ts";
import { buildCiiXml } from "./cii.ts";
import { invoiceFingerprint } from "./fingerprint.ts";
import {
  buildInvoiceData,
  type CompanyRow,
  type CreditedDocRow,
  type CustomerRow,
  type ParentDocRow,
  type SalesDocRow,
  type SalesLineRow,
} from "./mapping.ts";
import { buildInvoicePdf } from "./pdf.ts";
import type { InvoiceData } from "./types.ts";

/** Alles, was neben Beleg und Positionen in den Render eingeht. */
export type RenderBundle = {
  company: CompanyRow | null;
  customer: CustomerRow | null;
  parent: ParentDocRow | null;
  credited: CreditedDocRow[];
  typeCodes: Record<string, string>;
};

/**
 * Firmenfelder, die der Renderer liest. Das Bündel für den Browser enthält nur
 * diese, nicht die ganze Zeile aus `companies`.
 */
const COMPANY_RENDER_FIELDS = [
  "id",
  "name",
  "street_address",
  "postal_code",
  "city",
  "country",
  "email",
  "phone_number",
  "logo_image_url",
  "tax_number",
  "vat_id",
  "trade_register",
  "is_small_business",
  "iban",
  "bic",
  "bank_name",
  "payment_term_days",
  "currency",
  "invoice_accent_color",
] as const satisfies readonly (keyof CompanyRow)[];

export function pickCompanyForRender(row: CompanyRow | null): CompanyRow | null {
  if (!row) return null;
  return Object.fromEntries(
    COMPANY_RENDER_FIELDS.map((key) => [key, row[key] ?? null]),
  ) as CompanyRow;
}

export type PreparedRender = {
  data: InvoiceData;
  fingerprint: string;
  /** Nur rechnungsartige Belege mit `e_invoice` tragen ein XML. */
  xml: string | null;
  warnings: string[];
};

/**
 * Abbildung, Fingerabdruck und XML — alles außer dem PDF. Reicht für den
 * Abgleich vor dem Festschreiben (`fingerprint_only`, bautakt-web#217).
 */
export async function prepareRender(input: {
  doc: SalesDocRow;
  lines: SalesLineRow[];
  bundle: RenderBundle;
  today?: string;
}): Promise<PreparedRender> {
  const { doc, lines, bundle } = input;
  const data = buildInvoiceData({ doc, lines, ...bundle, today: input.today });
  const warnings = [...data.warnings];
  const fingerprint = await invoiceFingerprint(data, bundle.company?.logo_image_url ?? null);

  // Nur rechnungsartige Belege tragen ein Factur-X-XML, und nur, wenn der
  // Beleg nicht ausdruecklich als Rechnung ohne E-Rechnung angelegt ist.
  const xml = data.isInvoiceLike && doc.e_invoice !== false ? buildCiiXml(data) : null;
  if (!data.isInvoiceLike) {
    warnings.push(
      `Belegart "${data.documentType}" ist keine E-Rechnung — PDF/A-3b wurde ohne eingebettetes factur-x.xml erzeugt.`,
    );
  }
  return { data, fingerprint, xml, warnings };
}

export type RenderedDocument = PreparedRender & {
  pdf: Uint8Array;
  pageCount: number;
};

/** PDF/A-3b aus dem vorbereiteten Stand; `now` nur für reproduzierbare Tests. */
export async function renderPdf(
  prepared: PreparedRender,
  logo: { bytes: Uint8Array; mime: string } | null,
  now?: Date,
): Promise<RenderedDocument> {
  const pdf = await buildInvoicePdf({
    data: prepared.data,
    facturXml: prepared.xml,
    assets: { ...loadPdfAssets(), logo },
    now,
  });
  return {
    ...prepared,
    warnings: [...prepared.warnings, ...pdf.warnings],
    pdf: pdf.bytes,
    pageCount: pdf.pageCount,
  };
}
