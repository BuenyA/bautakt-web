/**
 * Layout „Briefbogen“ (Rechnungsvorlage `letterhead`).
 *
 * Vorbild sind die Ausgangsrechnungen von Spahr-Bau (Abschlags-, Schluss-
 * rechnung, Gutschrift): großes Logo rechts oben mit Leistungsaufzählung,
 * zwei Farbstreifen am linken Rand, kleine Absenderzeile über der Anschrift,
 * Nummer und Datum fett als Kennzahlenblock, Betreff (Bauvorhaben) und
 * „- Belegtitel -“, Summen mit Unter- und Doppelstrich statt Farbband,
 * Grußformel und ein Fuß mit Slogan, Rechtsangaben und fünf Spalten
 * (Telefon/Telefax, Internet/E-Mail, Bank, IBAN, BIC).
 *
 * Inhaltlich zeigt der Briefbogen dasselbe wie das Standardlayout — dieselben
 * Pflichtangaben, Summen und Hinweise aus `InvoiceData`. Nur die Anordnung
 * und Gestaltung unterscheiden sich. Das XML ist von der Vorlage unberührt.
 *
 * ⚠️ Zirkulärer Import mit pdf.ts: hier nur Funktionen und Typen aus pdf.ts
 * verwenden, nie deren Konstanten auf Modulebene — pdf.ts ist beim Auswerten
 * dieser Datei noch nicht fertig initialisiert. Deshalb eigene Seitenmaße.
 */

import { type PDFImage, type PDFPage, rgb, type RGB } from "pdf-lib";

import { formatCents, formatGermanDate, formatQuantity } from "./mapping.ts";
import {
  COLOR_MUTED as MUTED,
  COLOR_TEXT as TEXT,
  type Ctx,
  ensureSpace,
  sanitize,
  text,
  textRight,
  vatRateText,
  wrapText,
} from "./pdf.ts";
import type { LetterheadLayout } from "./template.ts";
import type { InvoiceData, RenderLine } from "./types.ts";

const PAGE_W = 595.28;
const PAGE_H = 841.89;

/** Textspalte: links Platz für die Streifen, rechts bündig mit dem Logo. */
const L = 74;
const R = 530;
/** Mittlere Wertspalte im Summenblock (Abzug der Abschläge). */
const MID_R = L + 300;

const SIZE = 9.8;
const SIZE_SMALL = 8;
const SIZE_TINY = 6.6;
const LINE = 13;

/** Unterkante des Textbereichs; darunter liegt der Fuß mit Slogan. */
export const LETTERHEAD_BODY_BOTTOM = 96;

const RULE: RGB = rgb(0.2, 0.2, 0.22);
const LIGHT_RULE: RGB = rgb(0.78, 0.8, 0.83);

function hexToRgb(hex: string): RGB {
  return rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );
}

// ---------------------------------------------------------------------------
// Beschriftungen
// ---------------------------------------------------------------------------

/** Ausgeschriebene Beschriftungen des Kennzahlenblocks je Belegart. */
function metaLabels(type: string): { number: string; date: string } {
  switch (type) {
    case "credit_note":
      return { number: "Gutschriftsnummer", date: "Gutschriftsdatum" };
    case "quote":
      return { number: "Angebotsnummer", date: "Angebotsdatum" };
    case "order_confirmation":
      return { number: "Auftragsnummer", date: "Datum" };
    case "delivery_note":
      return { number: "Lieferscheinnummer", date: "Datum" };
    default:
      return { number: "Rechnungsnummer", date: "Rechnungsdatum" };
  }
}

/** Präfix der Summenzeilen: „Gutschriftsnettosumme“ statt „Nettosumme“. */
function sumPrefix(type: string): string {
  return type === "credit_note" ? "Gutschrifts" : "";
}

// ---------------------------------------------------------------------------
// Kopf
// ---------------------------------------------------------------------------

/** Logo rechts oben, darunter die Leistungsaufzählung. Gibt die Unterkante zurück. */
function drawHead(ctx: Ctx, layout: LetterheadLayout, logo: PDFImage | null): number {
  const primary = hexToRgb(layout.primaryColor);
  const secondary = hexToRgb(layout.secondaryColor);
  const right = PAGE_W - 44;
  let bottom = PAGE_H - 30;

  if (logo) {
    const scale = Math.min(250 / logo.width, 92 / logo.height);
    const width = logo.width * scale;
    const height = logo.height * scale;
    ctx.page.drawImage(logo, { x: right - width, y: PAGE_H - 28 - height, width, height });
    bottom = PAGE_H - 28 - height;
  } else {
    // Ohne Logo steht der Firmenname an seiner Stelle.
    textRight(ctx, ctx.data.seller.name, right, PAGE_H - 56, {
      size: 18,
      bold: true,
      color: secondary,
    });
    bottom = PAGE_H - 66;
  }

  if (layout.services.length > 0) {
    const bulletX = right - 92;
    const textX = bulletX + 8;
    let y = bottom - 12;
    for (const service of layout.services) {
      const lines = wrapText(service, ctx.regular, 10.5, right - textX);
      ctx.page.drawCircle({ x: bulletX + 2, y: y + 3.4, size: 2.1, color: secondary });
      for (const line of lines) {
        text(ctx, line, textX, y, { size: 10.5, color: primary });
        y -= 12.5;
      }
    }
    bottom = y + 4;
  }
  return bottom;
}

/** Absenderzeile, Anschrift. Gibt die Unterkante der Anschrift zurück. */
function drawAddress(ctx: Ctx): number {
  const { seller, buyer } = ctx.data;
  const senderLine = [
    seller.name,
    seller.address.line1,
    [seller.address.postcode, seller.address.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" · ");
  let y = PAGE_H - 146;
  text(ctx, senderLine, L - 12, y, { size: SIZE_TINY, color: MUTED });

  y -= 18;
  const lines = buyer.name ? [buyer.name] : [];
  if (buyer.contactName) lines.push(buyer.contactName);
  if (buyer.address.line1) lines.push(buyer.address.line1);
  const city = [buyer.address.postcode, buyer.address.city].filter(Boolean).join(" ");
  if (city) lines.push(city);
  if (buyer.address.countryCode && buyer.address.countryCode !== seller.address.countryCode) {
    lines.push(buyer.address.countryCode);
  }
  for (const line of lines) {
    text(ctx, line, L, y, { size: SIZE + 0.4 });
    y -= LINE;
  }
  return y;
}

/** Nummer und Datum fett, darunter die übrigen Angaben normal. */
function drawMeta(ctx: Ctx, layout: LetterheadLayout, top: number): number {
  const { data } = ctx;
  const labels = metaLabels(data.documentType);
  const valueX = L + 178;
  let y = top;

  text(ctx, labels.number, L, y, { size: SIZE + 0.4, bold: true });
  text(ctx, data.documentNumber, valueX, y, { size: SIZE + 0.4, bold: true });
  y -= LINE;
  text(ctx, labels.date, L, y, { size: SIZE + 0.4, bold: true });
  const date = formatGermanDate(data.issueDate);
  text(ctx, date, valueX, y, { size: SIZE + 0.4, bold: true });
  if (layout.reference) {
    const dateWidth = ctx.bold.widthOfTextAtSize(sanitize(date), SIZE + 0.4);
    text(ctx, layout.reference, valueX + dateWidth + 4, y, { size: SIZE + 0.4 });
  }
  y -= LINE;

  const rows: [string, string][] = [];
  if (data.serviceDate) rows.push(["Leistungsdatum", formatGermanDate(data.serviceDate)]);
  if (data.buyer.customerNumber) rows.push(["Kundennummer", data.buyer.customerNumber]);
  if (data.payment.dueDate) rows.push(["Fällig am", formatGermanDate(data.payment.dueDate)]);
  if (data.buyerReference) rows.push(["Ihr Zeichen / Leitweg-ID", data.buyerReference]);
  for (const [label, value] of rows) {
    text(ctx, label, L, y, { size: SIZE_SMALL, color: MUTED });
    text(ctx, value, valueX, y, { size: SIZE_SMALL });
    y -= 11;
  }
  return y;
}

// ---------------------------------------------------------------------------
// Positionen
// ---------------------------------------------------------------------------

const COL_POS = L;
const COL_NAME = L + 24;
const COL_NAME_W = 200;
const COL_QTY_R = L + 268;
const COL_UNIT = L + 274;
const COL_PRICE_R = L + 372;

function showRates(data: InvoiceData): boolean {
  return new Set(data.lines.filter((l) => !l.isText).map((l) => l.taxRatePercent)).size > 1;
}

function drawTableHeader(ctx: Ctx): void {
  const head = { size: SIZE_SMALL - 0.4, color: MUTED };
  text(ctx, "Pos.", COL_POS, ctx.y, head);
  text(ctx, "Bezeichnung", COL_NAME, ctx.y, head);
  textRight(ctx, "Menge", COL_QTY_R, ctx.y, head);
  text(ctx, "Einheit", COL_UNIT, ctx.y, head);
  textRight(ctx, "Einzelpreis", COL_PRICE_R, ctx.y, head);
  textRight(ctx, "Gesamtpreis", R, ctx.y, head);
  ctx.page.drawLine({
    start: { x: L, y: ctx.y - 4 },
    end: { x: R, y: ctx.y - 4 },
    thickness: 0.4,
    color: LIGHT_RULE,
  });
  ctx.y -= 18;
}

function lineBlocks(ctx: Ctx, line: RenderLine, rates: boolean) {
  if (line.isText) {
    return {
      name: wrapText(
        [line.name, line.description].filter(Boolean).join("\n"),
        ctx.regular,
        SIZE,
        R - COL_NAME,
      ),
      desc: [] as string[],
    };
  }
  const desc = line.description ? wrapText(line.description, ctx.regular, SIZE_SMALL, COL_NAME_W) : [];
  if (line.allowanceCents > 0) {
    desc.push(
      line.discountPercent > 0
        ? `abzüglich ${vatRateText(line.discountPercent)} % Rabatt (${formatCents(line.allowanceCents, ctx.data.currency)})`
        : `abzüglich Rabatt (${formatCents(line.allowanceCents, ctx.data.currency)})`,
    );
  }
  if (rates) desc.push(`USt ${vatRateText(line.taxRatePercent)} %`);
  return { name: wrapText(line.name, ctx.regular, SIZE, COL_NAME_W), desc };
}

function drawLines(ctx: Ctx): void {
  const { data } = ctx;
  // Die Abschlagsabzüge der Schlussrechnung stehen gesammelt im Summenblock.
  const lines = data.settlement ? data.lines.filter((l) => !l.isPartialCredit) : data.lines;
  if (lines.length === 0) return;
  const rates = showRates(data);

  ensureSpace(ctx, 44);
  drawTableHeader(ctx);
  for (const line of lines) {
    const { name, desc } = lineBlocks(ctx, line, rates);
    const height = Math.max(1, name.length) * 12 + desc.length * 10 + 6;
    ensureSpace(ctx, height, (c) => drawTableHeader(c));
    const top = ctx.y;
    let y = top;
    for (const l of name) {
      text(ctx, l, COL_NAME, y, { size: SIZE, color: line.isText ? MUTED : TEXT });
      y -= 12;
    }
    for (const l of desc) {
      text(ctx, l, COL_NAME, y + 1, { size: SIZE_SMALL, color: MUTED });
      y -= 10;
    }
    if (!line.isText) {
      text(ctx, String(line.lineId ?? ""), COL_POS, top, { size: SIZE_SMALL });
      textRight(ctx, formatQuantity(line.quantity), COL_QTY_R, top, { size: SIZE });
      text(ctx, line.unitLabel || line.unitCode, COL_UNIT, top, { size: SIZE, color: MUTED });
      textRight(ctx, formatCents(line.unitPriceCents, data.currency), COL_PRICE_R, top, {
        size: SIZE,
      });
      textRight(ctx, formatCents(line.netAmountCents, data.currency), R, top, { size: SIZE });
    }
    ctx.y = y - 6;
  }
  ctx.y -= 4;
}

// ---------------------------------------------------------------------------
// Summen
// ---------------------------------------------------------------------------

/** Strich unter einem rechtsbündigen Wert; doppelt für den Endbetrag. */
function underline(ctx: Ctx, right: number, width: number, y: number, double = false): void {
  const line = (yy: number) =>
    ctx.page.drawLine({
      start: { x: right - width, y: yy },
      end: { x: right, y: yy },
      thickness: 0.6,
      color: RULE,
    });
  line(y);
  if (double) line(y - 2);
}

type SumRow = {
  label: string;
  /** Wert in der mittleren Spalte (nur beim Abzug der Abschläge). */
  mid?: string;
  midUnderline?: boolean;
  value?: string;
  underline?: boolean;
  total?: boolean;
};

function sumRows(data: InvoiceData): SumRow[] {
  const c = (cents: number) => formatCents(cents, data.currency);
  const prefix = sumPrefix(data.documentType);
  const rows: SumRow[] = [];

  if (data.settlement) {
    const s = data.settlement;
    rows.push({ label: "Nettosumme Gesamtleistung", value: c(s.totalNetCents) });
    s.totalTax.forEach((g, i) => {
      rows.push({
        label: `zzgl. ${vatRateText(g.ratePercent)} % MwSt.`,
        value: c(g.taxCents),
        underline: i === s.totalTax.length - 1,
      });
    });
    rows.push({ label: "", value: c(s.totalGrossCents) });
    rows.push({ label: "" });
    const numbers = data.precedingInvoices.map((p) => p.number).join(", ");
    rows.push({
      label: numbers
        ? `abzgl. geleisteter Abschlagszahlungen (${numbers})`
        : "abzgl. geleisteter Abschlagszahlungen",
    });
    rows.push({ label: "Nettosumme", mid: c(Math.abs(s.creditNetCents)) });
    rows.push({
      label: "zzgl. MwSt.",
      mid: c(Math.abs(s.creditTaxCents)),
      midUnderline: true,
      value: c(Math.abs(s.creditNetCents + s.creditTaxCents)),
      underline: true,
    });
    rows.push({ label: "Rechnungsbetrag", value: c(data.totals.grandTotalCents), total: true });
    return rows;
  }

  const onlyExempt = data.taxBreakdown.length === 1 && data.taxBreakdown[0].categoryCode !== "S";
  if (onlyExempt) {
    rows.push({
      label: `${prefix}${prefix ? "betrag" : "Rechnungsbetrag"}`,
      value: c(data.totals.grandTotalCents),
      total: true,
    });
    return rows;
  }
  rows.push({
    label: prefix ? `${prefix}nettosumme` : "Nettosumme",
    value: c(data.totals.taxBasisTotalCents),
  });
  const multi = data.taxBreakdown.length > 1;
  data.taxBreakdown.forEach((g, i) => {
    rows.push({
      label: multi
        ? `zzgl. ${vatRateText(g.ratePercent)} % MwSt. auf ${c(g.basisCents)}`
        : `zzgl. ${vatRateText(g.ratePercent)} % MwSt.`,
      value: c(g.taxCents),
      underline: i === data.taxBreakdown.length - 1,
    });
  });
  rows.push({
    label: prefix ? `${prefix}bruttosumme` : "Bruttosumme",
    value: c(data.totals.grandTotalCents),
    total: true,
  });
  return rows;
}

function drawSums(ctx: Ctx): void {
  const rows = sumRows(ctx.data);
  ensureSpace(ctx, rows.length * 15 + 20);
  ctx.y -= 8;
  for (const row of rows) {
    const opts = { size: SIZE + (row.total ? 0.6 : 0), bold: row.total };
    if (row.label) {
      for (const [i, l] of wrapText(row.label, ctx.regular, opts.size, MID_R - L).entries()) {
        text(ctx, l, L, ctx.y - i * 12, opts);
      }
    }
    const font = row.total ? ctx.bold : ctx.regular;
    if (row.mid) {
      textRight(ctx, row.mid, MID_R, ctx.y, opts);
      if (row.midUnderline) {
        underline(ctx, MID_R, font.widthOfTextAtSize(sanitize(row.mid), opts.size) + 24, ctx.y - 4);
      }
    }
    if (row.value) {
      textRight(ctx, row.value, R, ctx.y, opts);
      const width = Math.max(font.widthOfTextAtSize(sanitize(row.value), opts.size) + 24, 90);
      if (row.underline) underline(ctx, R, width, ctx.y - 4);
      if (row.total) underline(ctx, R, width, ctx.y - 5, true);
    }
    ctx.y -= row.total ? 22 : row.label || row.value ? 15 : 6;
  }
}

// ---------------------------------------------------------------------------
// Texte, Gruß
// ---------------------------------------------------------------------------

function paragraph(ctx: Ctx, body: string, opts: { size?: number; color?: RGB; gap?: number } = {}) {
  const size = opts.size ?? SIZE;
  const step = size + 3.2;
  const lines = wrapText(body, ctx.regular, size, R - L);
  if (lines.length === 0) return;
  ctx.y -= opts.gap ?? 8;
  for (const line of lines) {
    ensureSpace(ctx, step);
    text(ctx, line, L, ctx.y, { size, color: opts.color ?? TEXT });
    ctx.y -= step;
  }
}

function drawClosing(ctx: Ctx, layout: LetterheadLayout): void {
  if (!layout.closingGreeting && layout.signatureLines.length === 0) return;
  const needed = 18 + 40 + layout.signatureLines.length * 12;
  ensureSpace(ctx, needed);
  ctx.y -= 18;
  if (layout.closingGreeting) {
    text(ctx, layout.closingGreeting, L, ctx.y, { size: SIZE });
    ctx.y -= 40;
  }
  for (const line of layout.signatureLines) {
    text(ctx, line, L, ctx.y, { size: SIZE });
    ctx.y -= 12;
  }
}

// ---------------------------------------------------------------------------
// Einstieg
// ---------------------------------------------------------------------------

/** Seite 1 samt Folgeseiten; Fuß und Streifen kommen danach je Seite. */
export function drawLetterheadDocument(
  ctx: Ctx,
  layout: LetterheadLayout,
  logo: PDFImage | null,
): void {
  const { data } = ctx;
  drawHead(ctx, layout, logo);
  const addressBottom = drawAddress(ctx);

  ctx.y = Math.min(addressBottom - 30, PAGE_H - 250);
  ctx.y = drawMeta(ctx, layout, ctx.y) - 18;

  if (data.subject) {
    for (const line of wrapText(data.subject, ctx.bold, SIZE + 0.6, R - L)) {
      text(ctx, line, L, ctx.y, { size: SIZE + 0.6, bold: true });
      ctx.y -= LINE;
    }
  }
  // Storno und Gutschrift nennen ihr Original im Titel: „Gutschrift zur
  // Rechnung 2026403 vom 25.09.2026“.
  const title = layout.documentTitle || data.documentTitle;
  const original = data.documentType === "cancellation" || data.documentType === "credit_note"
    ? data.precedingInvoices[0]
    : undefined;
  const heading = original
    ? `${title} zur Rechnung ${original.number}${
      original.issueDate ? ` vom ${formatGermanDate(original.issueDate)}` : ""
    }`
    : `- ${title} -`;
  for (const line of wrapText(heading, ctx.bold, SIZE + 0.6, R - L - 8)) {
    text(ctx, line, data.subject ? L + 8 : L, ctx.y, { size: SIZE + 0.6, bold: true });
    ctx.y -= LINE;
  }
  ctx.y -= 8;

  if (data.introText) paragraph(ctx, data.introText, { gap: 4 });
  ctx.y -= 10;

  drawLines(ctx);
  drawSums(ctx);

  // Zahlungsbedingungen ohne Überschrift; die Bankverbindung steht im Fuß.
  ctx.y -= 6;
  paragraph(ctx, data.payment.termsText);
  if (
    data.payment.skontoPercent != null &&
    data.payment.skontoGrossCents != null
  ) {
    paragraph(
      ctx,
      `Skontobetrag: ${formatCents(data.payment.skontoAmountCents ?? 0, data.currency)}, Zahlbetrag bei Skontoabzug: ${formatCents(data.payment.skontoGrossCents, data.currency)}.`,
      { gap: 0 },
    );
  }
  if (data.notes) paragraph(ctx, data.notes);
  if (data.footerText) paragraph(ctx, data.footerText);
  if (data.taxHints.length > 0) {
    paragraph(ctx, data.taxHints.join("\n"), { size: SIZE_SMALL - 0.6, gap: 12 });
  }
  drawClosing(ctx, layout);
}

/** Streifen, Folgeseiten-Hinweis, Slogan und Fußspalten auf jeder Seite. */
export function drawLetterheadDecorations(ctx: Ctx, layout: LetterheadLayout): void {
  const { seller } = ctx.data;
  const primary = hexToRgb(layout.primaryColor);
  const secondary = hexToRgb(layout.secondaryColor);
  const total = ctx.pages.length;

  const banks = [
    { bankName: seller.bankName ?? "", iban: seller.iban ?? "", bic: seller.bic ?? "" },
    ...layout.extraBankAccounts,
  ].filter((b) => b.iban);

  const columns: { x: number; blocks: [string, string[]][] }[] = [
    {
      x: 60,
      blocks: [
        ["Telefon", seller.phone ? [seller.phone] : []],
        ["Telefax", layout.fax ? [layout.fax] : []],
      ],
    },
    {
      x: 136,
      blocks: [
        ["Internet", layout.website ? [layout.website] : []],
        ["E-Mail", seller.email ? [seller.email] : []],
      ],
    },
    { x: 222, blocks: [["Bank", banks.map((b) => b.bankName)]] },
    { x: 330, blocks: [["IBAN-Nr.", banks.map((b) => b.iban)]] },
    { x: 452, blocks: [["BIC-Nr.", banks.map((b) => b.bic)]] },
  ];

  for (let i = 0; i < total; i++) {
    const page = ctx.pages[i];
    if (layout.sideStripes) drawStripes(page, secondary, primary);

    if (layout.slogan) {
      page.drawText(sanitize(layout.slogan), {
        x: 60,
        y: 72,
        size: 13.5,
        font: ctx.regular,
        color: primary,
      });
    }
    if (layout.legalLine) {
      page.drawText(sanitize(layout.legalLine), {
        x: 60,
        y: 61,
        size: 5.8,
        font: ctx.regular,
        color: MUTED,
      });
    }
    for (const column of columns) {
      let y = 49;
      for (const [label, values] of column.blocks) {
        if (values.length === 0) continue;
        page.drawText(label, { x: column.x, y, size: 6.8, font: ctx.bold, color: TEXT });
        y -= 8.4;
        for (const value of values) {
          page.drawText(sanitize(value), { x: column.x, y, size: 6.8, font: ctx.regular, color: TEXT });
          y -= 8.4;
        }
      }
    }
    if (total > 1) {
      const label = `Seite ${i + 1} von ${total}`;
      page.drawText(label, {
        x: R - ctx.regular.widthOfTextAtSize(label, SIZE_TINY),
        y: 86,
        size: SIZE_TINY,
        font: ctx.regular,
        color: MUTED,
      });
    }
  }
}

/** Zwei senkrechte Streifen am linken Rand, unterbrochen an der Falzmarke. */
function drawStripes(page: PDFPage, left: RGB, right: RGB): void {
  const top = PAGE_H - 140;
  const bottom = 18;
  const fold = PAGE_H - 297.64;
  for (const [y0, y1] of [[fold + 3, top], [bottom, fold - 3]]) {
    page.drawRectangle({ x: 30, y: y0, width: 3, height: y1 - y0, color: left });
    page.drawRectangle({ x: 36, y: y0, width: 5, height: y1 - y0, color: right });
  }
}
