/**
 * Leistungsverzeichnis, Summen und Angebotstexte im PDF (bautakt-app#183).
 *
 * Beide Layouts (Standard und Briefbogen) rufen dieselbe Funktion mit ihrem
 * Rahmen auf: linke und rechte Kante, Schriftgrößen, Kopfzeile. Kopf, Anschrift,
 * Betreff, Titel, Einleitung und Fuß zeichnet weiter das jeweilige Layout. Für
 * Rechnungen läuft dieser Code nie, ihr PDF bleibt byte-gleich.
 */

import type { RGB } from "pdf-lib";

import { formatCents, formatGermanDate, formatQuantity } from "./mapping.ts";
import { COLOR_MUTED, COLOR_RULE, COLOR_TEXT, type Ctx, ensureSpace, text, textRight, wrapText } from "./pdf.ts";
import type { InvoiceData, QuoteInfo, RenderLine } from "./types.ts";

export type QuoteFrame = {
  left: number;
  right: number;
  size: number;
  sizeSmall: number;
  /** Fette Kurztexte wie im Standardlayout, normale im Briefbogen. */
  boldNames: boolean;
  /** Farbiges Band hinter der Kopfzeile (Standard), sonst nur ein Strich. */
  band?: { color: RGB; onColor: RGB };
  rule: RGB;
};

type Columns = {
  oz: number;
  name: number;
  nameW: number;
  qtyR: number;
  unit: number;
  priceR: number;
  amountR: number;
};

function columns(frame: QuoteFrame): Columns {
  const ozW = 58;
  const name = frame.left + ozW;
  return {
    oz: frame.left,
    name,
    nameW: frame.right - 214 - name,
    qtyR: frame.right - 172,
    unit: frame.right - 166,
    priceR: frame.right - 76,
    amountR: frame.right,
  };
}

function drawHeader(ctx: Ctx, frame: QuoteFrame, cols: Columns): void {
  const y = ctx.y;
  const color = frame.band ? frame.band.onColor : COLOR_MUTED;
  if (frame.band) {
    ctx.page.drawRectangle({
      x: frame.left,
      y: y - 4,
      width: frame.right - frame.left,
      height: 15,
      color: frame.band.color,
    });
  }
  const head = { size: frame.sizeSmall, bold: Boolean(frame.band), color };
  text(ctx, "OZ", cols.oz + (frame.band ? 2 : 0), y, head);
  text(ctx, "Leistung", cols.name, y, head);
  textRight(ctx, "Menge", cols.qtyR, y, head);
  text(ctx, "Einheit", cols.unit, y, head);
  textRight(ctx, "Einheitspreis", cols.priceR, y, head);
  textRight(ctx, "Gesamtpreis", cols.amountR, y, head);
  if (!frame.band) {
    ctx.page.drawLine({
      start: { x: frame.left, y: y - 4 },
      end: { x: frame.right, y: y - 4 },
      thickness: 0.4,
      color: frame.rule,
    });
  }
  ctx.y = y - (frame.band ? 16 : 18);
}

type Block = { name: string[]; desc: string[]; note: string[]; height: number };

function blockFor(ctx: Ctx, frame: QuoteFrame, cols: Columns, line: RenderLine): Block {
  const step = frame.size + 2.5;
  const small = frame.sizeSmall + 1.5;
  if (line.isText) {
    const name = wrapText(line.name, ctx.regular, frame.size, cols.amountR - cols.name);
    return { name, desc: [], note: [], height: Math.max(1, name.length) * step };
  }
  if (line.quoteRole === "title") {
    const name = wrapText(line.name, ctx.bold, frame.size + 0.5, cols.amountR - cols.name);
    return { name, desc: [], note: [], height: Math.max(1, name.length) * step };
  }
  if (line.quoteRole === "title_sum") {
    const name = wrapText(line.name, ctx.bold, frame.size, cols.priceR - cols.name - 8);
    return { name, desc: [], note: [], height: Math.max(1, name.length) * step };
  }
  const font = frame.boldNames ? ctx.bold : ctx.regular;
  const name = wrapText(line.name, font, frame.size, cols.nameW);
  const desc = line.description ? wrapText(line.description, ctx.regular, frame.sizeSmall, cols.nameW) : [];
  const note = line.note ? wrapText(line.note, ctx.regular, frame.sizeSmall - 0.6, cols.nameW) : [];
  return {
    name,
    desc,
    note,
    height: Math.max(1, name.length) * step + desc.length * small + note.length * small,
  };
}

function drawLine(ctx: Ctx, frame: QuoteFrame, cols: Columns, line: RenderLine, currency: string): void {
  const block = blockFor(ctx, frame, cols, line);
  ensureSpace(ctx, block.height, (c) => drawHeader(c, frame, cols));
  const top = ctx.y;
  const step = frame.size + 2.5;
  const small = frame.sizeSmall + 1.5;
  let y = top;

  if (line.isText) {
    for (const l of block.name) {
      text(ctx, l, cols.name, y, { size: frame.size, color: COLOR_MUTED });
      y -= step;
    }
    ctx.y = top - block.height;
    return;
  }

  if (line.quoteRole === "title") {
    text(ctx, line.oz ?? "", cols.oz, y, { size: frame.size, bold: true });
    for (const l of block.name) {
      text(ctx, l, cols.name, y, { size: frame.size + 0.5, bold: true });
      y -= step;
    }
    ctx.y = top - block.height;
    return;
  }

  if (line.quoteRole === "title_sum") {
    const amount = formatCents(line.netAmountCents, currency);
    for (const [i, l] of block.name.entries()) {
      text(ctx, l, cols.name, y - i * step, { size: frame.size, bold: true });
    }
    textRight(ctx, amount, cols.amountR, y, { size: frame.size, bold: true });
    ctx.y = top - block.height;
    return;
  }

  const excluded = line.quoteRole === "alternative" || line.quoteRole === "contingency" ||
    line.quoteRole === "unit_price_only";
  const valueColor = excluded ? COLOR_MUTED : COLOR_TEXT;

  text(ctx, line.oz ?? "", cols.oz, top, { size: frame.sizeSmall });
  for (const l of block.name) {
    text(ctx, l, cols.name, y, { size: frame.size, bold: frame.boldNames });
    y -= step;
  }
  for (const l of block.desc) {
    text(ctx, l, cols.name, y + 1, { size: frame.sizeSmall, color: COLOR_MUTED });
    y -= small;
  }
  for (const l of block.note) {
    text(ctx, l, cols.name, y + 1, { size: frame.sizeSmall - 0.6, color: COLOR_MUTED });
    y -= small;
  }

  textRight(ctx, formatQuantity(line.quantity), cols.qtyR, top, { size: frame.size, color: valueColor });
  text(ctx, line.unitLabel || line.unitCode, cols.unit, top, { size: frame.size, color: COLOR_MUTED });
  textRight(ctx, formatCents(line.unitPriceCents, currency), cols.priceR, top, {
    size: frame.size,
    color: valueColor,
  });
  if (line.quoteRole !== "unit_price_only") {
    textRight(ctx, formatCents(line.netAmountCents, currency), cols.amountR, top, {
      size: frame.size,
      bold: !excluded,
      color: valueColor,
    });
  }
  ctx.y = Math.min(top - block.height, y);
}

function vatText(rate: number): string {
  return String(rate).replace(".", ",");
}

type SumRow = { label: string; value: string; total?: boolean };

export function quoteSumRows(data: InvoiceData, quote: QuoteInfo): SumRow[] {
  const c = (cents: number) => formatCents(cents, data.currency);
  const rows: SumRow[] = [];
  if (quote.discountCents !== 0) {
    rows.push({ label: "Summe der Positionen", value: c(quote.positionsNetCents) });
    rows.push({ label: `abzüglich ${vatText(quote.discountPercent)} % Nachlass`, value: c(-quote.discountCents) });
  }
  const onlyExempt = data.taxMode !== "standard";
  if (onlyExempt) {
    rows.push({ label: "Angebotssumme", value: c(data.totals.grandTotalCents), total: true });
    return rows;
  }
  rows.push({ label: "Nettobetrag", value: c(data.totals.taxBasisTotalCents) });
  const multi = data.taxBreakdown.length > 1;
  for (const group of data.taxBreakdown) {
    rows.push({
      label: multi
        ? `zuzüglich ${vatText(group.ratePercent)} % USt auf ${c(group.basisCents)}`
        : `zuzüglich ${vatText(group.ratePercent)} % USt`,
      value: c(group.taxCents),
    });
  }
  rows.push({ label: "Angebotssumme", value: c(data.totals.grandTotalCents), total: true });
  return rows;
}

function drawSums(ctx: Ctx, frame: QuoteFrame, data: InvoiceData, quote: QuoteInfo): void {
  const rows = quoteSumRows(data, quote);
  ensureSpace(ctx, rows.length * 15 + 24);
  ctx.y -= 6;
  ctx.page.drawLine({
    start: { x: frame.left, y: ctx.y + 9 },
    end: { x: frame.right, y: ctx.y + 9 },
    thickness: 0.6,
    color: frame.rule,
  });
  const labelR = frame.right - 120;
  for (const row of rows) {
    const opts = { size: row.total ? frame.size + 0.6 : frame.size, bold: row.total };
    textRight(ctx, row.label, labelR, ctx.y, { ...opts, color: row.total ? COLOR_TEXT : COLOR_MUTED });
    textRight(ctx, row.value, frame.right, ctx.y, { ...opts, bold: true });
    if (row.total) {
      const width = ctx.bold.widthOfTextAtSize(row.value, opts.size) + 16;
      for (const dy of [5, 7]) {
        ctx.page.drawLine({
          start: { x: frame.right - width, y: ctx.y - dy },
          end: { x: frame.right, y: ctx.y - dy },
          thickness: 0.6,
          color: COLOR_RULE,
        });
      }
    }
    ctx.y -= row.total ? 20 : 14;
  }
}

function paragraph(ctx: Ctx, frame: QuoteFrame, title: string | null, body: string, gap = 10): void {
  const lines = wrapText(body, ctx.regular, frame.sizeSmall + 0.5, frame.right - frame.left);
  if (lines.length === 0) return;
  ctx.y -= gap;
  if (title) {
    ensureSpace(ctx, 14 + Math.min(lines.length, 2) * 11);
    text(ctx, title, frame.left, ctx.y, { size: frame.sizeSmall + 0.5, bold: true });
    ctx.y -= 12;
  }
  for (const line of lines) {
    ensureSpace(ctx, 11);
    text(ctx, line, frame.left, ctx.y, { size: frame.sizeSmall + 0.5, color: COLOR_TEXT });
    ctx.y -= 11;
  }
}

/** Zusätzliche Kennzahlen im Kopf: Gültig bis, Version, Ausführung. */
export function quoteMetaRows(quote: QuoteInfo): [string, string][] {
  const rows: [string, string][] = [];
  if (quote.validUntil) rows.push(["Gültig bis", formatGermanDate(quote.validUntil)]);
  if (quote.versionNo > 1) rows.push(["Version", String(quote.versionNo)]);
  if (quote.execFrom && quote.execTo) {
    rows.push(["Ausführung", `${formatGermanDate(quote.execFrom)} bis ${formatGermanDate(quote.execTo)}`]);
  } else if (quote.execFrom) {
    rows.push(["Ausführung ab", formatGermanDate(quote.execFrom)]);
  } else if (quote.execTo) {
    rows.push(["Ausführung bis", formatGermanDate(quote.execTo)]);
  }
  return rows;
}

/** Alles zwischen Einleitung und Grußformel. */
export function drawQuoteBody(ctx: Ctx, frame: QuoteFrame): void {
  const { data } = ctx;
  const quote = data.quote;
  if (!quote) return;
  const cols = columns(frame);

  if (quote.siteLine) paragraph(ctx, frame, null, `Objekt: ${quote.siteLine}`, 0);
  if (quote.prelimText) paragraph(ctx, frame, "Vorbemerkungen", quote.prelimText, 8);

  ctx.y -= 12;
  ensureSpace(ctx, 44);
  drawHeader(ctx, frame, cols);
  // Jede Zeile endet mit einem Strich knapp unter ihrer letzten Unterlänge,
  // die nächste Grundlinie liegt eine Schrifthöhe darunter. Titel tragen keinen
  // Strich, ihre Summenzeile steht dann unter dem Strich der letzten Position.
  for (const [i, line] of data.lines.entries()) {
    drawLine(ctx, frame, cols, line, data.currency);
    const next = data.lines[i + 1];
    const ruled = line.quoteRole !== "title" && next?.quoteRole !== "title";
    ctx.y += 3;
    if (ruled) {
      ctx.page.drawLine({
        start: { x: frame.left, y: ctx.y },
        end: { x: frame.right, y: ctx.y },
        thickness: 0.3,
        color: COLOR_RULE,
      });
    }
    ctx.y -= frame.size + (line.quoteRole === "title_sum" ? 8 : 4);
  }

  drawSums(ctx, frame, data, quote);

  const terms: string[] = [];
  if (quote.validUntil) terms.push(`Dieses Angebot gilt bis zum ${formatGermanDate(quote.validUntil)}.`);
  if (quote.contractBasis === "vob_b") {
    terms.push("Grundlage des Vertrags ist die VOB/B in der bei Vertragsschluss gültigen Fassung.");
  }
  if (quote.laborShareCents > 0) {
    terms.push(
      `Im Angebotspreis sind Arbeitskosten von ${formatCents(quote.laborShareCents, data.currency)} netto enthalten (§ 35a EStG).`,
    );
  }
  if (terms.length > 0) paragraph(ctx, frame, null, terms.join("\n"), 12);
  if (data.taxHints.length > 0) paragraph(ctx, frame, "Hinweise", data.taxHints.join("\n"), 10);
  if (data.footerText) paragraph(ctx, frame, null, data.footerText, 12);
}
