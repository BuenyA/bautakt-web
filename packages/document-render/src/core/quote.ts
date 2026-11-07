/**
 * Abbildung eines Angebots auf `InvoiceData` (bautakt-app#183).
 *
 * Kopf, Parteien, Vorlage, Akzentfarbe und Steuertexte kommen aus derselben
 * Abbildung wie bei Rechnungen (`buildInvoiceData`), damit ein Angebot genauso
 * aussieht wie die Rechnung, die später daraus wird. Eigen sind nur die
 * Gliederung (Titel, OZ, Arten), die Summen und die Angebotsangaben.
 *
 * Summen exakt wie `issue_quote_version`: je Position `round(Menge * EP, 2)`,
 * je Steuersatz summiert, Nachlass je Gruppe gerundet, USt je Gruppe gerundet.
 * Alternativ- und Bedarfspositionen zählen nicht. Gerechnet wird in ganzen
 * Cent, ohne Gleitkomma, damit kein Rundungsfall vom Server abweicht.
 *
 * Kein Deno, kein DOM: Die Datei gehört zum Render-Kern und wird nach
 * bautakt-web kopiert (`packages/document-render`).
 */

import {
  buildInvoiceData,
  buildTaxHintTexts,
  type CompanyRow,
  type CustomerRow,
  exemptionReasonFor,
  normalizeDate,
  roundHalfAwayFromZero,
  type SalesDocRow,
  taxCategoryFor,
  toCents,
  toNumber,
  toTaxMode,
  toUnitCode,
} from "./mapping.ts";
import type { InvoiceTemplateRow } from "./template.ts";
import type {
  DocumentTotals,
  InvoiceData,
  QuoteLineRole,
  RenderLine,
  TaxBreakdownGroup,
  TaxCategoryCode,
} from "./types.ts";

export type QuoteRow = {
  id: string;
  company_id: string;
  document_number: string | null;
  kind: string | null;
  customer_id: string | null;
  subject: string | null;
  site_street: string | null;
  site_postal_code: string | null;
  site_city: string | null;
};

export type QuoteVersionRow = {
  id: string;
  company_id: string;
  quote_id: string;
  version_no: number;
  quote_date: string | null;
  valid_until: string | null;
  exec_from: string | null;
  exec_to: string | null;
  contract_basis: string | null;
  tax_mode: string | null;
  currency: string | null;
  discount_percent: number | string | null;
  intro_text: string | null;
  prelim_text: string | null;
  closing_text: string | null;
  invoice_template_id: string | null;
  net_total: number | string | null;
  gross_total: number | string | null;
  labor_share_total: number | string | null;
  issued_at: string | null;
  created_at: string | null;
  storage_path: string | null;
  content_hash: string | null;
  subject: string | null;
  site_street: string | null;
  site_postal_code: string | null;
  site_city: string | null;
  buyer_name: string | null;
  buyer_street: string | null;
  buyer_postal_code: string | null;
  buyer_city: string | null;
  buyer_country: string | null;
  buyer_vat_id: string | null;
  buyer_customer_number: string | null;
  buyer_email: string | null;
  buyer_contact_name: string | null;
  seller_name: string | null;
  seller_street: string | null;
  seller_postal_code: string | null;
  seller_city: string | null;
  seller_country: string | null;
  seller_vat_id: string | null;
  seller_tax_number: string | null;
  seller_trade_register: string | null;
  seller_email: string | null;
  seller_phone: string | null;
  seller_iban: string | null;
  seller_bic: string | null;
  seller_bank_name: string | null;
};

export type QuoteItemRow = {
  id: string;
  parent_id: string | null;
  sort_order: number | null;
  oz: string | null;
  node_type: string;
  position_type: string | null;
  contingency_mode: string | null;
  alternative_to_id: string | null;
  short_text: string | null;
  long_text: string | null;
  quantity: number | string | null;
  unit: string | null;
  unit_price: number | string | null;
  tax_rate_percent: number | string | null;
  labor_share: number | string | null;
};

export type QuoteRenderInput = {
  quote: QuoteRow;
  version: QuoteVersionRow;
  items: QuoteItemRow[];
  company: CompanyRow | null;
  customer: CustomerRow | null;
  /** Ansprechpartner am Vorgang, nur für Entwürfe (festgeschrieben steht er in der Kopie). */
  contactPersonName?: string | null;
  template?: InvoiceTemplateRow | null;
  today?: string;
  /** Auftragsbestätigung statt Angebot (bautakt-app#187). Fehlt beim Angebot. */
  confirmation?: OrderConfirmationInput;
};

export type OrderConfirmationInput = {
  /** Nummer aus `quote_confirmations`, `null` rendert einen Entwurf ohne Nummer. */
  documentNumber: string | null;
  /** Datum der Bestätigung (`confirmation_date`). */
  date: string;
  /** Tag der Annahme durch den Kunden (`accepted_on`). */
  acceptedOn: string | null;
  /** Bei der Annahme gewählte Alternativ- und Bedarfspositionen. */
  selectedItemIds: string[];
};

function clean(value: string | null | undefined): string {
  return (value ?? "")
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/ /g, " ")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/**
 * Langtext als Klartext. Der Trigger an `quote_items` lässt nur p, br, b, i,
 * u, ul, ol, li stehen; hier werden daraus Absätze und Spiegelstriche.
 */
export function longTextToPlain(html: string | null | undefined): string {
  const text = (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol)\s*>/gi, "\n")
    .replace(/<li\s*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  return clean(text).replace(/\n{3,}/g, "\n\n");
}

/**
 * Beauftragter Umfang, wie `private.quote_accepted_net`: normale Positionen und
 * Pauschalen, außer eine gewählte Alternative ersetzt sie; gewählte Alternativen
 * und gewählte Bedarfspositionen. Nicht gewählte Alternativ- und
 * Bedarfspositionen fallen weg. Gewählte Positionen zählen wie normale, nur eine
 * Bedarfsposition „nur Einheitspreis“ bleibt ohne Betrag.
 */
export function acceptedScope(
  items: QuoteItemRow[],
  selectedItemIds: string[],
): { items: QuoteItemRow[]; notes: Map<string, string> } {
  const chosen = new Set(selectedItemIds);
  const byId = new Map(items.map((i) => [i.id, i]));
  const replaced = new Set(
    items
      .filter((i) => i.position_type === "alternative" && chosen.has(i.id) && i.alternative_to_id)
      .map((i) => i.alternative_to_id as string),
  );
  const notes = new Map<string, string>();
  const out: QuoteItemRow[] = [];
  for (const item of items) {
    if (item.node_type !== "position") {
      out.push(item);
      continue;
    }
    if (item.position_type === "alternative") {
      if (!chosen.has(item.id)) continue;
      const targetOz = clean(item.alternative_to_id ? byId.get(item.alternative_to_id)?.oz : null);
      notes.set(item.id, targetOz ? `Gewählte Alternative statt ${targetOz}` : "Gewählte Alternative");
      out.push({ ...item, position_type: "normal", alternative_to_id: null });
    } else if (item.position_type === "contingency") {
      if (!chosen.has(item.id)) continue;
      if (item.contingency_mode === "unit_price_only") {
        out.push(item);
      } else {
        notes.set(item.id, "Bedarfsposition, beauftragt");
        out.push({ ...item, position_type: "normal", contingency_mode: null });
      }
    } else if (!replaced.has(item.id)) {
      out.push(item);
    }
  }
  return { items: out, notes };
}

/** `YYYY-MM-DD` als `TT.MM.JJJJ`, sonst unverändert. */
function germanDate(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso ?? "");
}

/** Prozent mit höchstens zwei Stellen als Ganzzahl in Hundertsteln (10,5 % = 1050). */
function hundredths(percent: number): number {
  return Math.round(percent * 100);
}

/** `round(cents * (1 - p/100))`, halb weg von der Null, ganzzahlig. */
export function applyDiscountCents(cents: number, discountPercent: number): number {
  const factor = 10000 - hundredths(discountPercent);
  const product = cents * factor;
  const sign = product < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(product) + 5000) / 10000);
}

/** `round(cents * rate / 100)` für Sätze mit bis zu vier Stellen, ganzzahlig. */
export function taxOfCents(cents: number, ratePercent: number): number {
  const rate = Math.round(ratePercent * 10000);
  const product = cents * rate;
  const sign = product < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(product) + 500000) / 1000000);
}

/** Positionsbetrag wie `round(quantity * unit_price, 2)`. */
function lineCents(quantity: number, unitPriceCents: number): number {
  return roundHalfAwayFromZero(quantity * unitPriceCents);
}

/** Zählt die Position zur Angebotssumme? Wie `position_type IN ('normal','lump_sum')`. */
function counts(item: QuoteItemRow): boolean {
  return item.node_type === "position" &&
    (item.position_type === "normal" || item.position_type === "lump_sum");
}

/** Baum in Lesereihenfolge: Kinder nach `sort_order` unter ihrem Elternteil. */
function orderedTree(items: QuoteItemRow[]): { item: QuoteItemRow; depth: number }[] {
  const byParent = new Map<string | null, QuoteItemRow[]>();
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    // Ein Elternteil, das es nicht gibt, hängt die Zeile an die Wurzel.
    const parent = item.parent_id && ids.has(item.parent_id) ? item.parent_id : null;
    const list = byParent.get(parent) ?? [];
    list.push(item);
    byParent.set(parent, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => toNumber(a.sort_order) - toNumber(b.sort_order) || a.id.localeCompare(b.id));
  }
  const out: { item: QuoteItemRow; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const item of byParent.get(parent) ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push({ item, depth });
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function baseLine(partial: Partial<RenderLine> & { name: string }): RenderLine {
  return {
    lineId: null,
    isText: false,
    isPartialCredit: false,
    description: "",
    quantity: 0,
    unitLabel: "",
    unitCode: "C62",
    unitPriceCents: 0,
    netAmountCents: 0,
    allowanceCents: 0,
    discountPercent: 0,
    taxRatePercent: 0,
    taxCategory: "S",
    ...partial,
  };
}

/** Zeile in „Straße, PLZ Ort“, leer wenn nichts gepflegt ist. */
function siteLine(street: string, postal: string, city: string): string {
  const place = [postal, city].filter(Boolean).join(" ");
  return [street, place].filter(Boolean).join(", ");
}

export function buildQuoteData(input: QuoteRenderInput): InvoiceData {
  const { quote, version, company, customer } = input;
  const conf = input.confirmation;
  const scope = conf ? acceptedScope(input.items, conf.selectedItemIds) : null;
  const items = scope ? scope.items : input.items;
  const issued = Boolean(version.issued_at);
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const taxMode = toTaxMode(version.tax_mode);
  const discountPercent = toNumber(version.discount_percent);

  // Beleg, wie ihn die Rechnungsabbildung kennt. Festgeschrieben zählt die
  // Kopie an der Version, im Entwurf der Vorgang und der Kunde von heute.
  const doc: SalesDocRow = {
    id: version.id,
    company_id: version.company_id,
    type: conf ? "order_confirmation" : "quote",
    status: (conf ? Boolean(conf.documentNumber) : issued) ? "issued" : "draft",
    document_number: conf ? conf.documentNumber : issued ? quote.document_number : null,
    customer_id: quote.customer_id,
    subject: issued ? version.subject : quote.subject,
    invoice_template_id: version.invoice_template_id,
    buyer_reference: "",
    issue_date: version.quote_date,
    service_date: null,
    due_date: null,
    tax_mode: taxMode,
    currency: version.currency,
    net_total: version.net_total,
    vat_total: null,
    gross_total: version.gross_total,
    labor_share: version.labor_share_total,
    skonto_percent: null,
    skonto_days: null,
    payment_term_days: null,
    notes: "",
    intro_text: version.intro_text,
    footer_text: version.closing_text,
    created_at: version.created_at,
    e_invoice: false,
    storage_path: version.storage_path,
    content_hash: version.content_hash,
    buyer_name: version.buyer_name,
    buyer_street: version.buyer_street,
    buyer_postal_code: version.buyer_postal_code,
    buyer_city: version.buyer_city,
    buyer_country: version.buyer_country,
    buyer_vat_id: version.buyer_vat_id,
    buyer_customer_number: version.buyer_customer_number,
    buyer_email: version.buyer_email,
    buyer_contact_name: version.buyer_contact_name,
    seller_name: version.seller_name,
    seller_street: version.seller_street,
    seller_postal_code: version.seller_postal_code,
    seller_city: version.seller_city,
    seller_country: version.seller_country,
    seller_vat_id: version.seller_vat_id,
    seller_tax_number: version.seller_tax_number,
    seller_trade_register: version.seller_trade_register,
    seller_email: version.seller_email,
    seller_phone: version.seller_phone,
    seller_iban: version.seller_iban,
    seller_bic: version.seller_bic,
    seller_bank_name: version.seller_bank_name,
  };

  const base = buildInvoiceData({
    doc,
    lines: [],
    company,
    customer,
    template: input.template ?? null,
    today,
  });

  // Entwurf: Ansprechpartner des Vorgangs wie beim Festschreiben.
  const buyer = { ...base.buyer };
  const contactPerson = clean(input.contactPersonName);
  if (!issued && contactPerson) buyer.contactName = contactPerson;

  // --- Gliederung ------------------------------------------------------------
  const tree = orderedTree(items);
  const byId = new Map(items.map((i) => [i.id, i]));
  const rates = new Set(
    tree.filter(({ item }) => item.node_type === "position").map(({ item }) =>
      taxMode === "standard" ? toNumber(item.tax_rate_percent) : 0
    ),
  );
  const showRate = rates.size > 1;
  const sellerCountry = base.seller.countryIso;

  /** Nettobetrag der zählenden Positionen unter einem Titel. */
  const subtreeCents = new Map<string, number>();
  const addUp = (id: string | null, cents: number) => {
    let current = id;
    while (current) {
      subtreeCents.set(current, (subtreeCents.get(current) ?? 0) + cents);
      current = byId.get(current)?.parent_id ?? null;
    }
  };

  // Schlüssel ist der gespeicherte Satz, wie `GROUP BY tax_rate_percent` im Server.
  const groups = new Map<number, { category: TaxCategoryCode; ratePercent: number; netCents: number }>();
  let laborCents = 0;

  const positionLine = (item: QuoteItemRow): RenderLine => {
    const quantity = toNumber(item.quantity);
    const unitPriceCents = toCents(item.unit_price);
    const amount = lineCents(quantity, unitPriceCents);
    const rawRate = taxMode === "standard" ? toNumber(item.tax_rate_percent) : 0;
    const category = taxCategoryFor(taxMode, rawRate);
    const ratePercent = category === "S" ? rawRate : 0;

    let role: QuoteLineRole = "position";
    const notes: string[] = [];
    if (item.position_type === "alternative") {
      role = "alternative";
      const target = item.alternative_to_id ? byId.get(item.alternative_to_id) : undefined;
      const targetOz = clean(target?.oz);
      notes.push(
        targetOz
          ? `Alternativposition zu ${targetOz}, nicht in der Summe`
          : "Alternativposition, nicht in der Summe",
      );
    } else if (item.position_type === "contingency") {
      role = item.contingency_mode === "unit_price_only" ? "unit_price_only" : "contingency";
      notes.push(
        role === "unit_price_only"
          ? "Bedarfsposition, nur Einheitspreis"
          : "Bedarfsposition, nicht in der Summe",
      );
    }
    const scopeNote = scope?.notes.get(item.id);
    if (scopeNote) notes.push(scopeNote);
    if (showRate) notes.push(`USt ${String(ratePercent).replace(".", ",")} %`);

    if (counts(item)) {
      const key = toNumber(item.tax_rate_percent);
      const group = groups.get(key) ?? { category, ratePercent, netCents: 0 };
      group.netCents += amount;
      groups.set(key, group);
      addUp(item.parent_id, amount);
      laborCents += toCents(item.labor_share);
    }

    const unit = clean(item.unit) || (item.position_type === "lump_sum" ? "psch" : "");
    return baseLine({
      oz: clean(item.oz),
      quoteRole: role,
      name: clean(item.short_text) || "Position",
      description: longTextToPlain(item.long_text),
      quantity,
      unitLabel: unit,
      unitCode: toUnitCode(unit),
      unitPriceCents,
      netAmountCents: role === "unit_price_only" ? 0 : amount,
      taxRatePercent: ratePercent,
      taxCategory: category,
      ...(notes.length > 0 ? { note: notes.join("\n") } : {}),
    });
  };

  // Erst rechnen (Titelsummen brauchen alle Kinder), dann Zeilen setzen.
  const positions = new Map<string, RenderLine>();
  for (const { item } of tree) {
    if (item.node_type === "position") positions.set(item.id, positionLine(item));
  }

  const lines: RenderLine[] = [];
  const openTitles: { item: QuoteItemRow; depth: number }[] = [];
  const closeTitles = (depth: number) => {
    while (openTitles.length > 0 && openTitles[openTitles.length - 1].depth >= depth) {
      const { item } = openTitles.pop()!;
      const oz = clean(item.oz);
      const name = clean(item.short_text);
      lines.push(baseLine({
        oz,
        quoteRole: "title_sum",
        name: ["Summe", oz, name].filter(Boolean).join(" "),
        netAmountCents: subtreeCents.get(item.id) ?? 0,
      }));
    }
  };
  for (const { item, depth } of tree) {
    closeTitles(depth);
    if (item.node_type === "title") {
      lines.push(baseLine({ oz: clean(item.oz), quoteRole: "title", name: clean(item.short_text) || "Titel" }));
      openTitles.push({ item, depth });
    } else if (item.node_type === "text") {
      const body = [clean(item.short_text), longTextToPlain(item.long_text)].filter(Boolean).join("\n");
      if (body) lines.push(baseLine({ isText: true, name: body }));
    } else {
      lines.push(positions.get(item.id)!);
    }
  }
  closeTitles(0);

  // --- Summen wie issue_quote_version ------------------------------------------
  const taxBreakdown: TaxBreakdownGroup[] = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, group]) => {
      const basisCents = applyDiscountCents(group.netCents, discountPercent);
      return {
        categoryCode: group.category,
        ratePercent: group.ratePercent,
        basisCents,
        taxCents: taxMode === "standard" ? taxOfCents(basisCents, group.ratePercent) : 0,
        exemptionReason: exemptionReasonFor(group.category, taxMode, sellerCountry),
      };
    });
  const positionsNetCents = [...groups.values()].reduce((s, g) => s + g.netCents, 0);
  const netCents = taxBreakdown.reduce((s, g) => s + g.basisCents, 0);
  const taxCents = taxBreakdown.reduce((s, g) => s + g.taxCents, 0);
  const totals: DocumentTotals = {
    lineTotalCents: positionsNetCents,
    allowanceTotalCents: positionsNetCents - netCents,
    chargeTotalCents: 0,
    taxBasisTotalCents: netCents,
    taxTotalCents: taxCents,
    grandTotalCents: netCents + taxCents,
    prepaidCents: 0,
    duePayableCents: netCents + taxCents,
  };

  const warnings: string[] = [];
  // Die Bestätigung kann durch die Auswahl vom gespeicherten Angebotsbetrag abweichen.
  if (issued && !conf) {
    const storedNet = toCents(version.net_total);
    const storedGross = toCents(version.gross_total);
    if (storedNet !== totals.taxBasisTotalCents || storedGross !== totals.grandTotalCents) {
      warnings.push(
        `Gespeicherte Summen weichen ab (gespeichert netto ${storedNet} / brutto ${storedGross} Cent, berechnet netto ${totals.taxBasisTotalCents} / brutto ${totals.grandTotalCents} Cent).`,
      );
    }
  }
  if (!buyer.address.line1 || !buyer.address.city || !buyer.address.postcode) {
    warnings.push("Anschrift des Kunden unvollständig (Straße/PLZ/Ort).");
  }
  if (positions.size === 0) warnings.push("Das Angebot hat keine Position.");
  if (conf && !issued) warnings.push("Auftragsbestätigung zu einer Version, die nicht festgeschrieben ist.");

  const subject = clean(doc.subject);
  const site = issued
    ? siteLine(clean(version.site_street), clean(version.site_postal_code), clean(version.site_city))
    : siteLine(clean(quote.site_street), clean(quote.site_postal_code), clean(quote.site_city));

  const quoteTitle = quote.kind === "addendum" ? "Nachtragsangebot" : "Angebot";
  const title = conf ? "Auftragsbestätigung" : quoteTitle;
  // Die Bestätigung nennt das Angebot, dessen Einleitung und Schluss passen nicht.
  const introText = conf
    ? `Vielen Dank für Ihren Auftrag. Wir bestätigen ihn zu den Bedingungen unseres ${quoteTitle}s ${
      clean(quote.document_number)
    } vom ${germanDate(normalizeDate(version.quote_date))} mit folgendem Leistungsumfang.`
    : clean(version.intro_text);
  const footerText = conf ? "Wir freuen uns auf die Zusammenarbeit." : clean(version.closing_text);

  return {
    ...(subject ? { subject } : {}),
    // Ein Nachtrag heißt auch im Briefbogen so, sonst gilt der Titel der Vorlage.
    ...(base.layout
      ? { layout: quote.kind === "addendum" ? { ...base.layout, documentTitle: title } : base.layout }
      : {}),
    documentId: version.id,
    documentNumber: base.documentNumber,
    buyerReference: "",
    typeCode: "",
    einvoiceFormat: "zugferd",
    precedingInvoices: [],
    settlement: null,
    documentTitle: title,
    numberLabel: conf ? base.numberLabel : "Angebotsnr.",
    documentType: conf ? "order_confirmation" : "quote",
    isInvoiceLike: false,
    isDraft: conf ? !conf.documentNumber : !issued,
    issueDate: conf ? normalizeDate(conf.date) ?? today : normalizeDate(version.quote_date) ?? today,
    serviceDate: null,
    currency: base.currency,
    taxMode,
    seller: base.seller,
    buyer,
    lines,
    taxBreakdown,
    totals,
    payment: {
      termsText: "",
      dueDate: null,
      paymentTermDays: null,
      skontoPercent: null,
      skontoDays: null,
      skontoAmountCents: null,
      skontoGrossCents: null,
    },
    introText,
    footerText,
    notes: "",
    // Nur die Texte zur Steuerart. Aufbewahrungspflicht und Bauabzugsteuer
    // gehören auf die Rechnung, der Lohnanteil steht im Angebotsteil.
    taxHints: buildTaxHintTexts({
      country: sellerCountry,
      taxMode,
      customerType: "b2b",
      isConstructionBusiness: false,
      hasValidTaxExemption: true,
      hasLaborShare: false,
    }),
    accentColorHex: base.accentColorHex,
    warnings,
    quote: {
      versionNo: version.version_no,
      validUntil: conf ? null : normalizeDate(version.valid_until),
      execFrom: normalizeDate(version.exec_from),
      execTo: normalizeDate(version.exec_to),
      contractBasis: version.contract_basis === "vob_b" ? "vob_b" : "bgb",
      siteLine: site,
      prelimText: clean(version.prelim_text),
      discountPercent,
      positionsNetCents,
      discountCents: positionsNetCents - netCents,
      laborShareCents: applyDiscountCents(laborCents, discountPercent),
      ...(conf
        ? {
          confirmation: {
            quoteNumber: clean(quote.document_number),
            quoteDate: normalizeDate(version.quote_date),
            acceptedOn: normalizeDate(conf.acceptedOn),
          },
        }
        : {}),
    },
  };
}
