/**
 * PDF/A-3b mit eingebettetem Factur-X (`factur-x.xml`, bei XRechnung
 * `xrechnung.xml` mit Profil XRECHNUNG).
 *
 * Reine Funktion: `InvoiceData` + XML + Assets rein, PDF-Bytes raus. Laeuft
 * unter Deno (Edge Function) und unter Node (`tools/einvoice-validation`), deshalb
 * bare specifier fuer `pdf-lib` (siehe `deno.json`).
 *
 * PDF/A-3b braucht mehr, als pdf-lib von sich aus liefert:
 * - beide Schriften vollstaendig eingebettet (keine Standard-14-Schrift)
 * - OutputIntent mit eingebettetem sRGB-ICC-Profil
 * - XMP mit pdfaid part=3 / conformance=B **und** dem Factur-X-Extension-Schema
 *   (ohne dessen Deklaration ueber pdfaExtension waere der fremde Namespace
 *   selbst ein PDF/A-Verstoss)
 * - Anhang mit /AFRelationship und /AF im Catalog
 * Das geht nur ueber die Low-Level-API (context.obj / register / catalog.set).
 */

import {
  PDFDict,
  PDFDocument,
  PDFFont,
  PDFHexString,
  PDFName,
  PDFPage,
  PDFString,
  rgb,
  type RGB,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import { formatCents, formatGermanDate, formatGermanNumber, formatQuantity } from "./mapping.ts";
import type { InvoiceData, PdfAssets, RenderLine } from "./types.ts";

// ---------------------------------------------------------------------------
// Layout-Konstanten (A4)
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 56;
const MARGIN_R = 56;
const MARGIN_T = 48;
const MARGIN_B = 42;

const CONTENT_L = MARGIN_L;
const CONTENT_R = PAGE_W - MARGIN_R;

/** Hoehe, die der Briefbogen-Fuss auf jeder Seite belegt. */
const FOOTER_RESERVE = 74;
const BODY_BOTTOM = MARGIN_B + FOOTER_RESERVE;

const SIZE_TINY = 6.8;
const SIZE_SMALL = 8;
const SIZE_BASE = 9;
const SIZE_TITLE = 17;

const COLOR_TEXT: RGB = rgb(0.11, 0.12, 0.14);
const COLOR_MUTED: RGB = rgb(0.42, 0.45, 0.5);
const COLOR_RULE: RGB = rgb(0.78, 0.8, 0.83);
const COLOR_BAND: RGB = rgb(0.94, 0.95, 0.96);
const COLOR_PAPER: RGB = rgb(1, 1, 1);

// ---------------------------------------------------------------------------
// Akzentfarbe (companies.invoice_accent_color)
// ---------------------------------------------------------------------------

/**
 * Farbrolle je Layoutelement. Ohne gueltige Akzentfarbe steht hier exakt das
 * bisherige Verhalten — deshalb ist `DEFAULT_ACCENT` aus den alten Konstanten
 * gebaut und nicht daneben neu definiert.
 */
type AccentPalette = {
  /** Flaechenfarbe: Tabellenkopf, Summenband. */
  band: RGB;
  /** Textfarbe **auf** `band` — aus der Helligkeit von `band` abgeleitet. */
  onBand: RGB;
  /** Linienfarbe fuer die strukturgebenden Linien (Summentrenner, Fusslinie). */
  rule: RGB;
  /** Farbe des 17-pt-Belegtitels auf weissem Grund. */
  title: RGB;
};

const DEFAULT_ACCENT: AccentPalette = {
  band: COLOR_BAND,
  onBand: COLOR_TEXT,
  rule: COLOR_RULE,
  title: COLOR_TEXT,
};

/** Nur exakt `#RRGGBB` — alles andere ist kein Farbwert, sondern ein Tippfehler. */
const ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** WCAG-2.1-Relativluminanz einer sRGB-Farbe. */
function relativeLuminance(color: RGB): number {
  const channel = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue)
  );
}

/** WCAG-Kontrastverhaeltnis zweier Farben (1 = identisch, 21 = Schwarz/Weiss). */
function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * WCAG AA fuer "grossen Text" (>= 14 pt fett). Der Belegtitel ist 17 pt fett,
 * faellt also unter diese Schwelle — 4.5:1 waere hier die falsche Latte und
 * wuerde uebliche Markenfarben wie #1E88E5 grundlos aussortieren.
 */
const MIN_TITLE_CONTRAST = 3;
/**
 * Untergrenze fuer Linien. Kein WCAG-Kriterium (Linien tragen keinen Text),
 * sondern die Grenze, ab der eine 0,6-pt-Linie auf Weiss ueberhaupt noch zu
 * sehen ist. Darunter bleibt das neutrale Grau stehen, sonst verschwaende die
 * Akzentfarbe die vorhandene Struktur.
 */
const MIN_RULE_CONTRAST = 1.6;

/**
 * `#RRGGBB` → Palette. Defensiv: leerer, kaputter oder unbrauchbarer Wert
 * liefert `DEFAULT_ACCENT` plus (bei nicht-leerer Eingabe) eine Warnung.
 * Diese Funktion wirft nie — eine falsch getippte Farbe darf keine Rechnung
 * verhindern.
 */
export function buildAccentPalette(
  rawHex: string | null | undefined,
): { palette: AccentPalette; warnings: string[] } {
  const raw = (rawHex ?? "").trim();
  if (!raw) return { palette: DEFAULT_ACCENT, warnings: [] };
  if (!ACCENT_PATTERN.test(raw)) {
    return {
      palette: DEFAULT_ACCENT,
      warnings: [
        `Akzentfarbe "${raw}" ist kein gueltiger Farbwert im Format #RRGGBB — der Beleg wurde mit der Standardfarbe erzeugt.`,
      ],
    };
  }

  const accent = rgb(
    parseInt(raw.slice(1, 3), 16) / 255,
    parseInt(raw.slice(3, 5), 16) / 255,
    parseInt(raw.slice(5, 7), 16) / 255,
  );

  // Textfarbe auf der Flaeche aus deren Helligkeit ableiten: dunkler Grund →
  // heller Text und umgekehrt. Entschieden wird nach dem tatsaechlich
  // gemessenen Kontrast, nicht nach einer festen Helligkeitsschwelle.
  const onBand = contrastRatio(accent, COLOR_PAPER) >= contrastRatio(accent, COLOR_TEXT)
    ? COLOR_PAPER
    : COLOR_TEXT;

  const contrastOnPaper = contrastRatio(accent, COLOR_PAPER);
  const warnings: string[] = [];
  if (contrastOnPaper < MIN_TITLE_CONTRAST) {
    warnings.push(
      `Akzentfarbe ${raw.toUpperCase()} ist auf weissem Papier zu hell (Kontrast ${
        contrastOnPaper.toFixed(1)
      }:1, benoetigt ${MIN_TITLE_CONTRAST}:1) — Titel und Linien bleiben in der Standardfarbe, als Flaechenfarbe wird sie verwendet.`,
    );
  }

  return {
    palette: {
      band: accent,
      onBand,
      rule: contrastOnPaper >= MIN_RULE_CONTRAST ? accent : COLOR_RULE,
      title: contrastOnPaper >= MIN_TITLE_CONTRAST ? accent : COLOR_TEXT,
    },
    warnings,
  };
}

/** Spalten der Positionstabelle (x = links, r = rechte Kante fuer rechtsbuendig). */
const COL_POS_X = CONTENT_L;
const COL_NAME_X = CONTENT_L + 24;
const COL_NAME_W = 196;
const COL_QTY_R = CONTENT_L + 274;
const COL_UNIT_X = CONTENT_L + 280;
const COL_PRICE_R = CONTENT_L + 372;
const COL_VAT_R = CONTENT_L + 408;
const COL_AMOUNT_R = CONTENT_R;

// ---------------------------------------------------------------------------
// Text-Hilfen
// ---------------------------------------------------------------------------

/** Zeichen entfernen, die pdf-lib/fontkit nicht setzen kann. */
function sanitize(text: string): string {
  return (text ?? "")
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\t/g, " ")
    .replace(/\u00A0/g, " ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const clean = sanitize(text);
  if (!clean) return [];
  const out: string[] = [];
  for (const paragraph of clean.split("\n")) {
    if (!paragraph.trim()) {
      out.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) out.push(current);
      // Einzelnes Wort laenger als die Spalte: hart umbrechen.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let cut = rest.length;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
    if (current) out.push(current);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Datum / Metadaten
// ---------------------------------------------------------------------------

function two(n: number): string {
  return String(n).padStart(2, "0");
}

/** PDF-Datumsstring mit expliziter Zeitzone, z. B. D:20260822143000+00'00'. */
function pdfDate(date: Date): string {
  return (
    `D:${date.getUTCFullYear()}${two(date.getUTCMonth() + 1)}${two(date.getUTCDate())}` +
    `${two(date.getUTCHours())}${two(date.getUTCMinutes())}${two(date.getUTCSeconds())}+00'00'`
  );
}

/** XMP-Datum (ISO 8601) zum selben Zeitpunkt wie `pdfDate`. */
function xmpDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}-${two(date.getUTCMonth() + 1)}-${two(date.getUTCDate())}` +
    `T${two(date.getUTCHours())}:${two(date.getUTCMinutes())}:${two(date.getUTCSeconds())}+00:00`
  );
}

function xmlEscape(value: string): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PRODUCER = "Bautakt Finance (finance-document-render)";

/**
 * XMP-Paket. Enthaelt neben pdfaid auch das Factur-X-Extension-Schema — ohne
 * die pdfaExtension-Deklaration waere der fx-Namespace ein PDF/A-Verstoss und
 * kein Empfaenger wuerde die Datei als Factur-X erkennen.
 */
/**
 * Name und Profil des eingebetteten XML. ZUGFeRD 2.3 kennt für die XRechnung
 * ein eigenes Profil; Dateiname und ConformanceLevel muessen dazu passen.
 */
type EmbeddedXml = { fileName: string; conformanceLevel: string; description: string };

function embeddedXmlFor(format: InvoiceData["einvoiceFormat"]): EmbeddedXml {
  return format === "xrechnung"
    ? {
      fileName: "xrechnung.xml",
      conformanceLevel: "XRECHNUNG",
      description: "XRechnung (CII, CIUS 3.0)",
    }
    : {
      fileName: "factur-x.xml",
      conformanceLevel: "EN 16931",
      description: "Factur-X/ZUGFeRD XML-Rechnung (EN 16931)",
    };
}

function buildXmp(opts: {
  title: string;
  author: string;
  subject: string;
  created: Date;
  embedded: EmbeddedXml | null;
}): string {
  const created = xmpDate(opts.created);
  const facturXExtension = `
      <rdf:Description rdf:about=""
          xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
          xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
          xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
        <pdfaExtension:schemas>
          <rdf:Bag>
            <rdf:li rdf:parseType="Resource">
              <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
              <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
              <pdfaSchema:prefix>fx</pdfaSchema:prefix>
              <pdfaSchema:property>
                <rdf:Seq>
                  <rdf:li rdf:parseType="Resource">
                    <pdfaProperty:name>DocumentFileName</pdfaProperty:name>
                    <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                    <pdfaProperty:category>external</pdfaProperty:category>
                    <pdfaProperty:description>name of the embedded XML invoice file</pdfaProperty:description>
                  </rdf:li>
                  <rdf:li rdf:parseType="Resource">
                    <pdfaProperty:name>DocumentType</pdfaProperty:name>
                    <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                    <pdfaProperty:category>external</pdfaProperty:category>
                    <pdfaProperty:description>INVOICE</pdfaProperty:description>
                  </rdf:li>
                  <rdf:li rdf:parseType="Resource">
                    <pdfaProperty:name>Version</pdfaProperty:name>
                    <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                    <pdfaProperty:category>external</pdfaProperty:category>
                    <pdfaProperty:description>The actual version of the Factur-X XML schema</pdfaProperty:description>
                  </rdf:li>
                  <rdf:li rdf:parseType="Resource">
                    <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
                    <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                    <pdfaProperty:category>external</pdfaProperty:category>
                    <pdfaProperty:description>The conformance level of the embedded Factur-X data</pdfaProperty:description>
                  </rdf:li>
                </rdf:Seq>
              </pdfaSchema:property>
            </rdf:li>
          </rdf:Bag>
        </pdfaExtension:schemas>
      </rdf:Description>
      <rdf:Description rdf:about=""
          xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
        <fx:DocumentType>INVOICE</fx:DocumentType>
        <fx:DocumentFileName>${opts.embedded?.fileName ?? ""}</fx:DocumentFileName>
        <fx:Version>1.0</fx:Version>
        <fx:ConformanceLevel>${opts.embedded?.conformanceLevel ?? ""}</fx:ConformanceLevel>
      </rdf:Description>`;

  return `<?xpacket begin="${"﻿"}" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
        <pdfaid:part>3</pdfaid:part>
        <pdfaid:conformance>B</pdfaid:conformance>
      </rdf:Description>
      <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:format>application/pdf</dc:format>
        <dc:title>
          <rdf:Alt>
            <rdf:li xml:lang="x-default">${xmlEscape(opts.title)}</rdf:li>
          </rdf:Alt>
        </dc:title>
        <dc:creator>
          <rdf:Seq>
            <rdf:li>${xmlEscape(opts.author)}</rdf:li>
          </rdf:Seq>
        </dc:creator>
        <dc:description>
          <rdf:Alt>
            <rdf:li xml:lang="x-default">${xmlEscape(opts.subject)}</rdf:li>
          </rdf:Alt>
        </dc:description>
      </rdf:Description>
      <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
        <xmp:CreatorTool>${xmlEscape(PRODUCER)}</xmp:CreatorTool>
        <xmp:CreateDate>${created}</xmp:CreateDate>
        <xmp:ModifyDate>${created}</xmp:ModifyDate>
        <xmp:MetadataDate>${created}</xmp:MetadataDate>
      </rdf:Description>
      <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
        <pdf:Producer>${xmlEscape(PRODUCER)}</pdf:Producer>
      </rdf:Description>${opts.embedded ? facturXExtension : ""}
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

type Ctx = {
  doc: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  pages: PDFPage[];
  page: PDFPage;
  y: number;
  data: InvoiceData;
  accent: AccentPalette;
};

/** „Rechnung RE00002“; ein Entwurf hat noch keine Nummer, nur „Rechnung“. */
function documentHeading(data: InvoiceData): string {
  return data.documentNumber ? `${data.documentTitle} ${data.documentNumber}` : data.documentTitle;
}

function newPage(ctx: Ctx): void {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(page);
  ctx.page = page;
  ctx.y = PAGE_H - MARGIN_T;
  if (ctx.pages.length > 1) {
    // Folgeseiten tragen den Beleg im Kopf, damit lose Blätter zuordenbar bleiben.
    const label = documentHeading(ctx.data);
    page.drawText(sanitize(label), {
      x: CONTENT_L,
      y: ctx.y,
      size: SIZE_TINY,
      font: ctx.regular,
      color: COLOR_MUTED,
    });
    ctx.y -= 22;
  }
}

function text(
  ctx: Ctx,
  value: string,
  x: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: RGB } = {},
): void {
  const size = opts.size ?? SIZE_BASE;
  ctx.page.drawText(sanitize(value), {
    x,
    y,
    size,
    font: opts.bold ? ctx.bold : ctx.regular,
    color: opts.color ?? COLOR_TEXT,
  });
}

function textRight(
  ctx: Ctx,
  value: string,
  right: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: RGB } = {},
): void {
  const size = opts.size ?? SIZE_BASE;
  const font = opts.bold ? ctx.bold : ctx.regular;
  const clean = sanitize(value);
  text(ctx, clean, right - font.widthOfTextAtSize(clean, size), y, opts);
}

function rule(ctx: Ctx, y: number, color: RGB = COLOR_RULE, thickness = 0.6): void {
  ctx.page.drawLine({
    start: { x: CONTENT_L, y },
    end: { x: CONTENT_R, y },
    thickness,
    color,
  });
}

function ensureSpace(ctx: Ctx, needed: number, onNewPage?: (ctx: Ctx) => void): void {
  if (ctx.y - needed >= BODY_BOTTOM) return;
  newPage(ctx);
  onNewPage?.(ctx);
}

/** Briefkopf: Logo + Absenderblock rechts. Gibt die Unterkante zurueck. */
function drawLetterhead(ctx: Ctx, logoImage: { width: number; height: number } | null): number {
  const { seller } = ctx.data;
  let rightY = PAGE_H - MARGIN_T - SIZE_BASE;

  const sellerLines: string[] = [seller.name];
  if (seller.address.line1) sellerLines.push(seller.address.line1);
  const cityLine = [seller.address.postcode, seller.address.city].filter(Boolean).join(" ");
  if (cityLine) sellerLines.push(cityLine);
  if (seller.phone) sellerLines.push(`Tel. ${seller.phone}`);
  if (seller.email) sellerLines.push(seller.email);

  for (let i = 0; i < sellerLines.length; i++) {
    textRight(ctx, sellerLines[i], CONTENT_R, rightY, {
      size: i === 0 ? SIZE_BASE : SIZE_SMALL,
      bold: i === 0,
      color: i === 0 ? COLOR_TEXT : COLOR_MUTED,
    });
    rightY -= i === 0 ? 12 : 10;
  }

  let leftBottom = PAGE_H - MARGIN_T;
  if (logoImage) {
    leftBottom = PAGE_H - MARGIN_T - logoImage.height;
  }
  return Math.min(rightY, leftBottom) - 6;
}

/** Empfaengerblock links, Kennzahlenblock rechts. */
function drawAddressAndMeta(ctx: Ctx, top: number): number {
  const { data } = ctx;
  const { seller, buyer } = data;

  // Absenderzeile ueber dem Adressfeld (DIN 5008)
  const senderLine = [
    seller.name,
    seller.address.line1,
    [seller.address.postcode, seller.address.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" · ");
  let y = Math.min(top, PAGE_H - 150);
  text(ctx, senderLine, CONTENT_L, y, { size: SIZE_TINY, color: COLOR_MUTED });
  ctx.page.drawLine({
    start: { x: CONTENT_L, y: y - 3 },
    end: { x: CONTENT_L + 240, y: y - 3 },
    thickness: 0.4,
    color: COLOR_RULE,
  });

  y -= 18;
  const addressTop = y;
  const addressLines = buyer.name ? [buyer.name] : [];
  if (buyer.contactName) addressLines.push(buyer.contactName);
  if (buyer.address.line1) addressLines.push(buyer.address.line1);
  const buyerCity = [buyer.address.postcode, buyer.address.city].filter(Boolean).join(" ");
  if (buyerCity) addressLines.push(buyerCity);
  if (buyer.address.countryCode && buyer.address.countryCode !== seller.address.countryCode) {
    addressLines.push(buyer.address.countryCode);
  }
  for (const line of addressLines) {
    text(ctx, line, CONTENT_L, y, { size: SIZE_BASE + 0.5 });
    y -= 12.5;
  }

  // Kennzahlen rechts
  const metaRows: [string, string][] = [
    [data.numberLabel, data.documentNumber],
    ["Datum", formatGermanDate(data.issueDate)],
  ];
  if (data.serviceDate) {
    metaRows.push(["Leistungsdatum", formatGermanDate(data.serviceDate)]);
  }
  // Storno und Gutschrift nennen ihr Original im Kopf; die Schlussrechnung
  // nennt ihre Abschläge in den Abzugszeilen.
  const original = data.documentType === "cancellation" || data.documentType === "credit_note"
    ? data.precedingInvoices[0]
    : undefined;
  if (original) metaRows.push(["Zu Rechnung", original.number]);
  if (buyer.customerNumber) metaRows.push(["Kundennummer", buyer.customerNumber]);
  if (data.payment.dueDate) metaRows.push(["Fällig am", formatGermanDate(data.payment.dueDate)]);
  if (seller.vatId) metaRows.push(["USt-IdNr.", seller.vatId]);
  else if (seller.taxNumber) metaRows.push(["Steuernummer", seller.taxNumber]);

  let metaY = addressTop;
  const metaLabelX = CONTENT_R - 190;
  for (const [label, value] of metaRows) {
    text(ctx, label, metaLabelX, metaY, { size: SIZE_SMALL, color: COLOR_MUTED });
    textRight(ctx, value, CONTENT_R, metaY, { size: SIZE_SMALL, bold: true });
    metaY -= 12;
  }

  return Math.min(y, metaY) - 22;
}

function drawTableHeader(ctx: Ctx): void {
  const headerY = ctx.y;
  ctx.page.drawRectangle({
    x: CONTENT_L,
    y: headerY - 4,
    width: CONTENT_R - CONTENT_L,
    height: 15,
    color: ctx.accent.band,
  });
  const ty = headerY;
  // Kopfzeile steht auf der Akzentflaeche — Textfarbe kommt aus deren Helligkeit.
  const head = { size: SIZE_SMALL, bold: true, color: ctx.accent.onBand };
  text(ctx, "Pos", COL_POS_X + 2, ty, head);
  text(ctx, "Bezeichnung", COL_NAME_X, ty, head);
  textRight(ctx, "Menge", COL_QTY_R, ty, head);
  text(ctx, "Einheit", COL_UNIT_X, ty, head);
  textRight(ctx, "Einzelpreis", COL_PRICE_R, ty, head);
  textRight(ctx, "USt", COL_VAT_R, ty, head);
  textRight(ctx, "Betrag", COL_AMOUNT_R, ty, head);
  ctx.y = headerY - 12;
}

function lineHeight(ctx: Ctx, line: RenderLine): number {
  const nameLines = wrapText(line.name, ctx.bold, SIZE_BASE, COL_NAME_W);
  const descLines = line.description
    ? wrapText(line.description, ctx.regular, SIZE_SMALL, COL_NAME_W)
    : [];
  if (line.isText) {
    const wide = wrapText(
      [line.name, line.description].filter(Boolean).join("\n"),
      ctx.regular,
      SIZE_BASE,
      CONTENT_R - COL_NAME_X,
    );
    return Math.max(1, wide.length) * 11 + 6;
  }
  return Math.max(1, nameLines.length) * 11 + descLines.length * 9.5 + 7;
}

function drawLine(ctx: Ctx, line: RenderLine, currency: string): void {
  const height = lineHeight(ctx, line);
  const top = ctx.y;

  if (line.isText) {
    const wide = wrapText(
      [line.name, line.description].filter(Boolean).join("\n"),
      ctx.regular,
      SIZE_BASE,
      CONTENT_R - COL_NAME_X,
    );
    let y = top;
    for (const l of wide) {
      text(ctx, l, COL_NAME_X, y, { size: SIZE_BASE, color: COLOR_MUTED });
      y -= 11;
    }
    ctx.y = top - height;
    return;
  }

  const nameLines = wrapText(line.name, ctx.bold, SIZE_BASE, COL_NAME_W);
  const descLines = line.description
    ? wrapText(line.description, ctx.regular, SIZE_SMALL, COL_NAME_W)
    : [];

  text(ctx, String(line.lineId ?? ""), COL_POS_X + 2, top, { size: SIZE_SMALL });
  let y = top;
  for (const l of nameLines) {
    text(ctx, l, COL_NAME_X, y, { size: SIZE_BASE, bold: true });
    y -= 11;
  }
  for (const l of descLines) {
    text(ctx, l, COL_NAME_X, y, { size: SIZE_SMALL, color: COLOR_MUTED });
    y -= 9.5;
  }

  textRight(ctx, formatQuantity(line.quantity), COL_QTY_R, top, { size: SIZE_BASE });
  text(ctx, line.unitLabel || line.unitCode, COL_UNIT_X, top, {
    size: SIZE_BASE,
    color: COLOR_MUTED,
  });
  textRight(ctx, formatCents(line.unitPriceCents, currency), COL_PRICE_R, top, { size: SIZE_BASE });
  textRight(ctx, `${formatGermanNumber(line.taxRatePercent, 0)} %`, COL_VAT_R, top, {
    size: SIZE_BASE,
  });
  textRight(ctx, formatCents(line.netAmountCents, currency), COL_AMOUNT_R, top, {
    size: SIZE_BASE,
    bold: true,
  });

  if (line.allowanceCents > 0) {
    const label = line.discountPercent > 0
      ? `abzüglich ${formatGermanNumber(line.discountPercent, 2)} % Rabatt (${formatCents(line.allowanceCents, currency)})`
      : `abzüglich Rabatt (${formatCents(line.allowanceCents, currency)})`;
    text(ctx, label, COL_NAME_X, y, { size: SIZE_TINY, color: COLOR_MUTED });
    y -= 9;
  }

  ctx.y = Math.min(top - height, y - 2);
}

function drawTotals(ctx: Ctx): void {
  const { data } = ctx;
  const rows = data.settlement
    ? settlementRows(data.settlement, data.totals.grandTotalCents, data.currency)
    : totalRows(data, data.currency);

  // Der Summenblock darf nicht umbrechen; auf einer neuen Seite steht er ohne
  // Tabellenkopf (ein Kopf ohne Positionen darunter waere irrefuehrend).
  const blockHeight = rows.length * 14 + 18;
  ensureSpace(ctx, blockHeight);
  drawTotalRows(ctx, rows);
}

type TotalRow = { label: string; value: string; bold?: boolean };

function vatRateText(ratePercent: number): string {
  return formatGermanNumber(ratePercent, ratePercent % 1 === 0 ? 0 : 2);
}

/**
 * Schlussrechnung nach § 14 Abs. 5 UStG: Gesamtentgelt und Steuer, davon die
 * Abschläge samt Steuer abgezogen, übrig bleibt der Restbetrag.
 */
function settlementRows(
  settlement: NonNullable<InvoiceData["settlement"]>,
  grandTotalCents: number,
  currency: string,
): TotalRow[] {
  const rows: TotalRow[] = [
    { label: "Gesamtleistung netto", value: formatCents(settlement.totalNetCents, currency) },
  ];
  for (const group of settlement.totalTax) {
    if (group.taxCents === 0) continue;
    rows.push({
      label: `zzgl. ${vatRateText(group.ratePercent)} % USt`,
      value: formatCents(group.taxCents, currency),
    });
  }
  rows.push({
    label: "Gesamtleistung brutto",
    value: formatCents(settlement.totalGrossCents, currency),
  });
  rows.push({
    label: "abzgl. Abschläge netto",
    value: formatCents(settlement.creditNetCents, currency),
  });
  if (settlement.creditTaxCents !== 0) {
    rows.push({
      label: "abzgl. USt der Abschläge",
      value: formatCents(settlement.creditTaxCents, currency),
    });
  }
  rows.push({ label: "Restbetrag", value: formatCents(grandTotalCents, currency), bold: true });
  return rows;
}

function totalRows(data: InvoiceData, currency: string): TotalRow[] {
  const rows: TotalRow[] = [];
  rows.push({
    label: "Nettobetrag",
    value: formatCents(data.totals.taxBasisTotalCents, currency),
  });
  // Bei genau einer steuerfreien Gruppe (Kleinunternehmer, Reverse Charge)
  // waere eine "0 % USt"-Zeile nur Rauschen — der Grund steht unter Hinweise.
  const onlyExemptGroup =
    data.taxBreakdown.length === 1 && data.taxBreakdown[0].categoryCode !== "S";
  if (!onlyExemptGroup) {
    for (const group of data.taxBreakdown) {
      rows.push({
        label: `zzgl. ${vatRateText(group.ratePercent)} % USt auf ${formatCents(group.basisCents, currency)}`,
        value: formatCents(group.taxCents, currency),
      });
    }
  }
  rows.push({
    label: data.taxMode === "standard" ? "Gesamtbetrag" : "Rechnungsbetrag",
    value: formatCents(data.totals.grandTotalCents, currency),
    bold: true,
  });
  return rows;
}

function drawTotalRows(ctx: Ctx, rows: TotalRow[]): void {
  const labelRight = CONTENT_R - 120;
  ctx.y -= 4;
  rule(ctx, ctx.y + 8, ctx.accent.rule);
  for (const row of rows) {
    // Das Band der Summenzeile beginnt links vom Label, nicht mittendrin:
    // sonst laege dessen letztes Stueck auf der Akzentflaeche und der Rest auf
    // Weiss — mit dunkler Akzentfarbe waeren genau diese Zeichen unlesbar.
    const bandX = row.bold
      ? labelRight - ctx.bold.widthOfTextAtSize(sanitize(row.label), SIZE_BASE) - 8
      : 0;
    if (row.bold) {
      ctx.page.drawRectangle({
        x: bandX,
        y: ctx.y - 4,
        width: CONTENT_R - bandX,
        height: 16,
        color: ctx.accent.band,
      });
    }
    textRight(ctx, row.label, labelRight, ctx.y, {
      size: row.bold ? SIZE_BASE : SIZE_SMALL,
      bold: row.bold,
      color: row.bold ? ctx.accent.onBand : COLOR_MUTED,
    });
    textRight(ctx, row.value, CONTENT_R, ctx.y, {
      size: row.bold ? SIZE_BASE + 1 : SIZE_BASE,
      bold: true,
      color: row.bold ? ctx.accent.onBand : COLOR_TEXT,
    });
    ctx.y -= row.bold ? 18 : 13;
  }
}

function drawParagraphBlock(ctx: Ctx, title: string | null, body: string[], gap = 10): void {
  if (body.length === 0) return;
  const lines: string[] = [];
  for (const item of body) {
    lines.push(...wrapText(item, ctx.regular, SIZE_SMALL, CONTENT_R - CONTENT_L));
  }
  const needed = lines.length * 10 + (title ? 14 : 0) + gap;
  ensureSpace(ctx, needed);
  ctx.y -= gap;
  if (title) {
    text(ctx, title, CONTENT_L, ctx.y, { size: SIZE_SMALL, bold: true });
    ctx.y -= 12;
  }
  for (const line of lines) {
    text(ctx, line, CONTENT_L, ctx.y, { size: SIZE_SMALL, color: COLOR_MUTED });
    ctx.y -= 10;
  }
}

function drawFooters(ctx: Ctx): void {
  const { seller } = ctx.data;
  const total = ctx.pages.length;
  const colW = (CONTENT_R - CONTENT_L) / 3;

  const col1 = [seller.name, seller.address.line1, [seller.address.postcode, seller.address.city].filter(Boolean).join(" ")];
  const col2: string[] = [];
  if (seller.phone) col2.push(`Tel. ${seller.phone}`);
  if (seller.email) col2.push(seller.email);
  if (seller.vatId) col2.push(`USt-IdNr. ${seller.vatId}`);
  if (seller.taxNumber) col2.push(`Steuernummer ${seller.taxNumber}`);
  if (seller.tradeRegister) col2.push(seller.tradeRegister);
  const col3: string[] = [];
  if (seller.bankName) col3.push(seller.bankName);
  if (seller.iban) col3.push(`IBAN ${seller.iban}`);
  if (seller.bic) col3.push(`BIC ${seller.bic}`);

  for (let i = 0; i < total; i++) {
    const page = ctx.pages[i];
    const baseY = MARGIN_B + 46;
    page.drawLine({
      start: { x: CONTENT_L, y: baseY + 12 },
      end: { x: CONTENT_R, y: baseY + 12 },
      thickness: 0.4,
      color: ctx.accent.rule,
    });

    const columns = [col1, col2, col3];
    for (let c = 0; c < columns.length; c++) {
      let y = baseY;
      for (const lineText of columns[c].slice(0, 4)) {
        page.drawText(sanitize(lineText), {
          x: CONTENT_L + c * colW,
          y,
          size: SIZE_TINY,
          font: ctx.regular,
          color: COLOR_MUTED,
        });
        y -= 8.5;
      }
    }

    const label = `Seite ${i + 1} von ${total}`;
    page.drawText(label, {
      x: CONTENT_R - ctx.regular.widthOfTextAtSize(label, SIZE_TINY),
      y: MARGIN_B,
      size: SIZE_TINY,
      font: ctx.regular,
      color: COLOR_MUTED,
    });
  }
}

// ---------------------------------------------------------------------------
// PDF/A-Infrastruktur
// ---------------------------------------------------------------------------

function applyPdfAStructure(
  doc: PDFDocument,
  opts: {
    icc: Uint8Array;
    xmp: string;
    facturXml: Uint8Array | null;
    embedded: EmbeddedXml;
    now: Date;
    title: string;
    author: string;
    subject: string;
  },
): void {
  const context = doc.context;
  const catalog = doc.catalog;
  const dateString = pdfDate(opts.now);

  // --- Dokumentinformationen (muessen zum XMP passen) ----------------------
  doc.setTitle(opts.title);
  doc.setAuthor(opts.author);
  doc.setSubject(opts.subject);
  doc.setProducer(PRODUCER);
  doc.setCreator(PRODUCER);
  // Eigene Datumsstrings statt PDFString.fromDate: pdf-lib schreibt "...Z",
  // hier soll die Zeitzone explizit als +00'00' im XMP-identischen Format stehen.
  const infoDict = context.lookup(context.trailerInfo.Info, PDFDict);
  infoDict.set(PDFName.of("CreationDate"), PDFString.of(dateString));
  infoDict.set(PDFName.of("ModDate"), PDFString.of(dateString));

  // --- OutputIntent mit eingebettetem sRGB-Profil --------------------------
  const iccRef = context.register(
    context.flateStream(opts.icc, { N: 3 }),
  );
  const outputIntent = context.obj({
    Type: "OutputIntent",
    S: "GTS_PDFA1",
    OutputConditionIdentifier: PDFString.of("sRGB"),
    OutputCondition: PDFString.of("sRGB IEC61966-2.1"),
    RegistryName: PDFString.of("http://www.color.org"),
    Info: PDFString.of("sRGB IEC61966-2.1"),
    DestOutputProfile: iccRef,
  });
  catalog.set(PDFName.of("OutputIntents"), context.obj([outputIntent]));

  // --- XMP -----------------------------------------------------------------
  // Selbst nach UTF-8 kodieren: `context.stream(string)` schreibt pro
  // UTF-16-Code-Unit **ein** Byte. Aus "u-Umlaut" wird damit 0xFC statt
  // 0xC3 0xBC, aus dem Gedankenstrich das Steuerzeichen 0x13 und aus dem
  // BOM am Paketanfang das nackte 0xFF. Ein XMP-Paket muss aber UTF-8 sein —
  // der Validator meldet sonst "Could not parse XMP metadata (XML invalid)"
  // und stuft das PDF als nicht PDF/A-konform ein, sobald irgendein Umlaut in
  // Firmen- oder Kundenname steht.
  const metadataRef = context.register(
    context.stream(new TextEncoder().encode(opts.xmp), { Type: "Metadata", Subtype: "XML" }),
  );
  catalog.set(PDFName.of("Metadata"), metadataRef);

  // --- Anhang factur-x.xml -------------------------------------------------
  if (opts.facturXml) {
    const embeddedRef = context.register(
      context.flateStream(opts.facturXml, {
        Type: "EmbeddedFile",
        Subtype: "text/xml",
        Params: context.obj({
          ModDate: PDFString.of(dateString),
          Size: opts.facturXml.length,
        }),
      }),
    );

    const fileSpecRef = context.register(
      context.obj({
        Type: "Filespec",
        F: PDFString.of(opts.embedded.fileName),
        UF: PDFHexString.fromText(opts.embedded.fileName),
        Desc: PDFString.of(opts.embedded.description),
        AFRelationship: "Alternative",
        EF: context.obj({ F: embeddedRef, UF: embeddedRef }),
      }),
    );

    catalog.set(
      PDFName.of("Names"),
      context.obj({
        EmbeddedFiles: context.obj({
          Names: context.obj([PDFString.of(opts.embedded.fileName), fileSpecRef]),
        }),
      }),
    );
    // /AF gehoert in den Catalog — nur ein Eintrag im Names-Baum reicht
    // fuer PDF/A-3 nicht aus.
    catalog.set(PDFName.of("AF"), context.obj([fileSpecRef]));
  }

  // --- Datei-ID (PDF/A verlangt eine /ID im Trailer) -----------------------
  const idSeed = `${opts.title}|${dateString}|${opts.author}`;
  const idHex = simpleHashHex(idSeed);
  context.trailerInfo.ID = context.obj([
    PDFHexString.of(idHex),
    PDFHexString.of(idHex),
  ]);
}

/** Deterministische 32-Zeichen-Hex-ID (kein Krypto-Anspruch, nur /ID). */
function simpleHashHex(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c + i, 0x85ebca6b) >>> 0;
  }
  // >>> 0 ist Pflicht: ohne die Konvertierung liefert XOR/Addition einen
  // vorzeichenbehafteten Wert, dessen toString(16) ein "-" enthaelt — und ein
  // Minuszeichen in einem Hex-String verletzt PDF/A (ISO 19005-3, 6.1.6).
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return (part(h1) + part(h2) + part((h1 ^ h2) >>> 0) + part((h1 + h2) >>> 0)).toUpperCase();
}

// ---------------------------------------------------------------------------
// Einstieg
// ---------------------------------------------------------------------------

export type BuildPdfResult = {
  bytes: Uint8Array;
  pageCount: number;
  warnings: string[];
};

/**
 * Baut das PDF/A-3b. `facturXml` wird nur eingebettet, wenn es uebergeben wird
 * (rechnungsartige Belege) — ein Angebot ist keine E-Rechnung.
 */
export async function buildInvoicePdf(opts: {
  data: InvoiceData;
  facturXml: string | null;
  assets: PdfAssets;
  now?: Date;
}): Promise<BuildPdfResult> {
  const { data, assets } = opts;
  const now = opts.now ?? new Date();
  const warnings: string[] = [];

  const accent = buildAccentPalette(data.accentColorHex);
  warnings.push(...accent.warnings);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const regular = await doc.embedFont(assets.regularFont, { subset: true });
  const bold = await doc.embedFont(assets.semiBoldFont, { subset: true });

  const ctx: Ctx = {
    doc,
    regular,
    bold,
    pages: [],
    page: undefined as unknown as PDFPage,
    y: 0,
    data,
    accent: accent.palette,
  };
  newPage(ctx);

  // Logo defensiv: ein fehlendes oder kaputtes Bild darf den Render nie kippen.
  let logoBox: { width: number; height: number } | null = null;
  if (assets.logo?.bytes && assets.logo.bytes.length > 0) {
    try {
      const image = assets.logo.mime.includes("png")
        ? await doc.embedPng(assets.logo.bytes)
        : await doc.embedJpg(assets.logo.bytes);
      const maxW = 150;
      const maxH = 54;
      const scale = Math.min(maxW / image.width, maxH / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.page.drawImage(image, {
        x: CONTENT_L,
        y: PAGE_H - MARGIN_T - height,
        width,
        height,
      });
      logoBox = { width, height };
    } catch (e) {
      warnings.push(
        `Firmenlogo konnte nicht eingebettet werden, Beleg wurde ohne Logo erzeugt: ${
          e instanceof Error ? e.message : "unbekannter Fehler"
        }`,
      );
    }
  }

  const headTop = drawLetterhead(ctx, logoBox);
  ctx.y = drawAddressAndMeta(ctx, headTop);

  // Titel
  ensureSpace(ctx, 40);
  const title = documentHeading(data);
  text(ctx, title, CONTENT_L, ctx.y, { size: SIZE_TITLE, bold: true, color: ctx.accent.title });
  ctx.y -= 20;

  if (data.introText) {
    const introLines = wrapText(data.introText, regular, SIZE_BASE, CONTENT_R - CONTENT_L);
    for (const line of introLines) {
      ensureSpace(ctx, 12);
      text(ctx, line, CONTENT_L, ctx.y, { size: SIZE_BASE });
      ctx.y -= 11;
    }
    ctx.y -= 6;
  }

  // Positionstabelle
  ctx.y -= 6;
  ensureSpace(ctx, 40);
  drawTableHeader(ctx);
  ctx.y -= 4;

  for (const line of data.lines) {
    const needed = lineHeight(ctx, line);
    ensureSpace(ctx, needed + 4, (c) => {
      drawTableHeader(c);
      c.y -= 4;
    });
    drawLine(ctx, line, data.currency);
    ctx.page.drawLine({
      start: { x: CONTENT_L, y: ctx.y + 4 },
      end: { x: CONTENT_R, y: ctx.y + 4 },
      thickness: 0.3,
      color: COLOR_RULE,
    });
    ctx.y -= 4;
  }

  drawTotals(ctx);

  // Zahlungsbedingungen; eine Gutschrift wird verrechnet, nicht überwiesen.
  const paymentLines: string[] = [data.payment.termsText];
  const isCreditNote = data.documentType === "credit_note";
  if (
    data.payment.skontoPercent != null &&
    data.payment.skontoDays != null &&
    data.payment.skontoGrossCents != null
  ) {
    paymentLines.push(
      `Skontobetrag: ${formatCents(data.payment.skontoAmountCents ?? 0, data.currency)}, Zahlbetrag bei Skontoabzug: ${formatCents(data.payment.skontoGrossCents, data.currency)}.`,
    );
  }
  if (data.seller.iban && !isCreditNote) {
    const bank = [
      data.seller.bankName ? `Bank: ${data.seller.bankName}` : null,
      `IBAN: ${data.seller.iban}`,
      data.seller.bic ? `BIC: ${data.seller.bic}` : null,
    ]
      .filter(Boolean)
      .join("   ");
    paymentLines.push(bank);
    if (data.documentNumber) paymentLines.push(`Verwendungszweck: ${data.documentNumber}`);
  }
  drawParagraphBlock(ctx, isCreditNote ? "Verrechnung" : "Zahlungsbedingungen", paymentLines, 14);

  if (data.taxHints.length > 0) {
    drawParagraphBlock(ctx, "Hinweise", data.taxHints, 12);
  }
  if (data.notes) {
    drawParagraphBlock(ctx, "Anmerkungen", [data.notes], 12);
  }
  if (data.footerText) {
    drawParagraphBlock(ctx, null, [data.footerText], 12);
  }

  drawFooters(ctx);

  const xmlBytes = opts.facturXml ? new TextEncoder().encode(opts.facturXml) : null;
  const embedded = embeddedXmlFor(data.einvoiceFormat);
  const heading = documentHeading(data);
  const subject = data.buyer.name ? `${heading} - ${data.buyer.name}` : heading;
  applyPdfAStructure(doc, {
    icc: assets.iccProfile,
    xmp: buildXmp({
      title: heading,
      author: data.seller.name,
      subject,
      created: now,
      embedded: xmlBytes != null ? embedded : null,
    }),
    facturXml: xmlBytes,
    embedded,
    now,
    title: heading,
    author: data.seller.name,
    subject,
  });

  const bytes = await doc.save({ useObjectStreams: false });
  return { bytes, pageCount: ctx.pages.length, warnings };
}
