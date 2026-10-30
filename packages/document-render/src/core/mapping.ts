/**
 * DB-Zeilen → `InvoiceData`. Reine Funktionen, keine Supabase-Abhängigkeit,
 * damit die Abbildung ohne Netz testbar bleibt.
 *
 * Spiegelt bewusst die App-Logik:
 * - Geldarithmetik wie `app/lib/finance/money.ts` (Cent, kaufmännische Rundung,
 *   USt einmal pro Steuersatzgruppe gerundet — nie pro Position).
 * - Steuermodi und Pflichttexte wie `app/lib/finance/tax/hints.ts`.
 * Hier entsteht keine zweite Steuerlogik.
 */

import type {
  BuyerParty,
  CountryIso,
  DocumentTotals,
  EInvoiceFormat,
  InvoiceData,
  PaymentInfo,
  RenderLine,
  SellerParty,
  TaxBreakdownGroup,
  TaxCategoryCode,
  TaxMode,
} from "./types.ts";
import { type InvoiceTemplateRow, resolveLetterhead } from "./template.ts";

/** Ursprungsbeleg eines Stornos oder einer Gutschrift, nur für BT-25. */
export type ParentDocRow = {
  document_number: string | null;
  issue_date: string | null;
};

/** Abgezogener Abschlag (`credited_document_id` einer Position), für BT-25. */
export type CreditedDocRow = ParentDocRow & { id: string };

export type SalesDocRow = {
  id: string;
  company_id: string;
  type: string;
  status: string;
  document_number: string | null;
  customer_id: string | null;
  /** Ursprungsbeleg bei Storno und Gutschrift (BT-25). */
  parent_document_id?: string | null;
  /** Betreff / Bauvorhaben über dem Belegtitel (nur PDF). */
  subject?: string | null;
  /** Gewählte Rechnungsvorlage; leer = Standardvorlage des Betriebs. */
  invoice_template_id?: string | null;
  /** BT-10 Leitweg-ID / Käuferreferenz. NOT NULL DEFAULT '' in der DB. */
  buyer_reference: string | null;
  issue_date: string | null;
  service_date: string | null;
  due_date: string | null;
  tax_mode: string | null;
  currency: string | null;
  net_total: number | string | null;
  vat_total: number | string | null;
  gross_total: number | string | null;
  labor_share: number | string | null;
  skonto_percent: number | string | null;
  skonto_days: number | null;
  payment_term_days: number | null;
  notes: string | null;
  intro_text: string | null;
  footer_text: string | null;
  created_at: string | null;
  /**
   * E-Rechnung ja/nein (Standard true). `false` heißt: PDF ohne eingebettetes
   * XML. Wirkt nur bei rechnungsartigen Belegen (`index.ts`).
   */
  e_invoice?: boolean | null;
  /** `zugferd` (Standard) oder `xrechnung`; nur bei `e_invoice` wirksam. */
  einvoice_format?: string | null;
  /**
   * Archivstand. Beide Felder schreibt ausschliesslich diese Function; sie
   * werden hier nur gelesen, um einen festgeschriebenen Beleg nicht erneut
   * zu rendern (siehe `index.ts`).
   */
  storage_path: string | null;
  content_hash: string | null;
  /**
   * Käufer zum Zeitpunkt des Festschreibens (finalize_sales_document). Ein
   * festgeschriebener Beleg zeigt ausschliesslich diese Kopie, damit eine
   * spätere Adressänderung am Kontakt ihn nicht verändert (GoBD).
   */
  buyer_name: string | null;
  buyer_street: string | null;
  buyer_postal_code: string | null;
  buyer_city: string | null;
  buyer_country: string | null;
  buyer_vat_id: string | null;
  buyer_customer_number: string | null;
  buyer_email: string | null;
  /** BT-56 Ansprechpartner beim Käufer, Kopie wie die übrigen `buyer_*`. */
  buyer_contact_name: string | null;
  /**
   * Verkäufer zum Zeitpunkt des Festschreibens (bautakt-web#157), Kopie aus
   * `companies`. Leer bei Entwürfen und bei Belegen von vor der Kopie.
   */
  seller_name?: string | null;
  seller_street?: string | null;
  seller_postal_code?: string | null;
  seller_city?: string | null;
  seller_country?: string | null;
  seller_vat_id?: string | null;
  seller_tax_number?: string | null;
  seller_trade_register?: string | null;
  seller_email?: string | null;
  seller_phone?: string | null;
  seller_iban?: string | null;
  seller_bic?: string | null;
  seller_bank_name?: string | null;
};

export type SalesLineRow = {
  id: string;
  sort_order: number | null;
  kind: string | null;
  title: string | null;
  description: string | null;
  quantity: number | string | null;
  unit: string | null;
  unit_price: number | string | null;
  discount_percent: number | string | null;
  tax_rate_percent: number | string | null;
  tax_category: string | null;
  net_amount: number | string | null;
  /** Abschlagsrechnung, die diese Position abzieht (nur `partial_credit`). */
  credited_document_id?: string | null;
};

export type CompanyRow = {
  id: string;
  name: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone_number: string | null;
  logo_image_url: string | null;
  tax_number: string | null;
  vat_id: string | null;
  trade_register: string | null;
  is_small_business: boolean | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  payment_term_days: number | null;
  currency: string | null;
  /** Akzentfarbe der Rechnungsvorlage (`#RRGGBB`, leer = Standard). */
  invoice_accent_color: string | null;
  /** Registergericht, für die Rechtsangaben im Briefbogen-Fuß. */
  register_court?: string | null;
  /** Geschäftsführer, für die Rechtsangaben im Briefbogen-Fuß. */
  managing_directors?: string[] | null;
};

/** `contacts` — Stammdaten des Geschäftspartners. */
export type ContactRow = {
  kind: string | null;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  /** ISO 3166-1 alpha-2 */
  country: string | null;
  vat_id: string | null;
};

/** `customer_profiles` — Daten der Kundenrolle. */
export type CustomerProfileRow = {
  customer_number: string | null;
  is_construction_business: boolean | null;
  tax_exemption_valid_until: string | null;
  payment_term_days: number | null;
  billing_street: string | null;
  billing_postal_code: string | null;
  billing_city: string | null;
  billing_country: string | null;
};

/** Der Kunde am Beleg: Kontakt plus Kundenrolle. */
export type CustomerRow = {
  contact: ContactRow;
  profile: CustomerProfileRow;
};

// ---------------------------------------------------------------------------
// Geld (Cent) — Port von app/lib/finance/money.ts
// ---------------------------------------------------------------------------

/** Kaufmännische Rundung: halb weg von der Null. */
export function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value >= 0 ? Math.round(value) : -Math.round(-value);
}

/** numeric(14,2) aus der DB (Euro) → Cent. */
export function toCents(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return roundHalfAwayFromZero(n * 100);
}

export function toNumber(value: number | string | null | undefined, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : (value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

/** Prozent von einem Cent-Betrag, kaufmännisch gerundet. */
export function percentOfCents(cents: number, percent: number): number {
  if (!Number.isFinite(cents) || !Number.isFinite(percent)) return 0;
  return roundHalfAwayFromZero((cents * percent) / 100);
}

// ---------------------------------------------------------------------------
// Länder / Einheiten
// ---------------------------------------------------------------------------

const COUNTRY_LABEL_TO_ISO: Record<string, string> = {
  deutschland: "DE",
  germany: "DE",
  österreich: "AT",
  oesterreich: "AT",
  austria: "AT",
  schweiz: "CH",
  switzerland: "CH",
};

/**
 * Freitext-Land → ISO 3166-1 alpha-2 (BT-40 / BT-55 sind Pflicht in EN16931).
 * Akzeptiert ISO-Codes und die deutschen Klartext-Länder, die vor der
 * Finance-Migration gespeichert wurden (analog `app/lib/finance/country.ts`).
 */
export function toCountryCode(value: string | null | undefined, fallback = "DE"): string {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const mapped = COUNTRY_LABEL_TO_ISO[raw.toLowerCase()];
  return mapped ?? fallback;
}

/** Auf DE/AT/CH eingeschränkt — nur für die Auswahl der Pflichttexte. */
export function toFinanceCountryIso(value: string | null | undefined): CountryIso {
  const code = toCountryCode(value, "DE");
  return code === "AT" ? "AT" : code === "CH" ? "CH" : "DE";
}

/**
 * Freitext-Einheit (`sales_document_lines.unit`) → UN/ECE Rec. 20 (BT-130).
 * Fallback ist `C62` ("one"), der neutrale Stückcode.
 */
export function toUnitCode(unit: string | null | undefined): string {
  const raw = (unit ?? "").trim().toLowerCase().replace(/\./g, "");
  if (!raw) return "C62";
  switch (raw) {
    case "h":
    case "hr":
    case "std":
    case "stunde":
    case "stunden":
    case "akh":
    case "arbeitsstunde":
    case "arbeitsstunden":
      return "HUR";
    case "min":
    case "minute":
    case "minuten":
      return "MIN";
    case "tag":
    case "tage":
    case "d":
      return "DAY";
    case "woche":
    case "wochen":
      return "WEE";
    case "monat":
    case "monate":
      return "MON";
    case "stk":
    case "stck":
    case "st":
    case "stück":
    case "stueck":
    case "x":
    case "psc":
    case "pcs":
      return "H87";
    case "m":
    case "meter":
    case "lfm":
    case "lm":
    case "laufmeter":
    case "rm":
      return "MTR";
    case "km":
      return "KMT";
    case "m2":
    case "m²":
    case "qm":
    case "quadratmeter":
      return "MTK";
    case "m3":
    case "m³":
    case "cbm":
    case "kubikmeter":
      return "MTQ";
    case "kg":
    case "kilogramm":
      return "KGM";
    case "g":
    case "gramm":
      return "GRM";
    case "t":
    case "to":
    case "tonne":
    case "tonnen":
      return "TNE";
    case "l":
    case "ltr":
    case "liter":
      return "LTR";
    case "ml":
      return "MLT";
    case "pauschal":
    case "pausch":
    case "psch":
    case "pau":
    case "pos":
    case "set":
    case "stk pauschal":
      return "C62";
    default:
      return "C62";
  }
}

// ---------------------------------------------------------------------------
// Belegarten
// ---------------------------------------------------------------------------

type DocTypeInfo = {
  typeCode: string;
  title: string;
  numberLabel: string;
  isInvoiceLike: boolean;
};

/**
 * BT-3 (UNTDID 1001) und deutscher Belegtitel.
 *
 * Die Typcodes hier sind nur der Rückfall. Maßgeblich ist die Tabelle
 * `sales_document_type_codes` (bautakt-web#154), anpassbar ohne Deployment;
 * die Vorbelegung dort ist dieselbe wie hier.
 */
const DOC_TYPES: Record<string, DocTypeInfo> = {
  invoice: { typeCode: "380", title: "Rechnung", numberLabel: "Rechnungsnr.", isInvoiceLike: true },
  partial_invoice: {
    typeCode: "326",
    title: "Teilrechnung",
    numberLabel: "Rechnungsnr.",
    isInvoiceLike: true,
  },
  final_invoice: {
    typeCode: "380",
    title: "Schlussrechnung",
    numberLabel: "Rechnungsnr.",
    isInvoiceLike: true,
  },
  credit_note: {
    typeCode: "381",
    title: "Gutschrift",
    numberLabel: "Gutschriftsnr.",
    isInvoiceLike: true,
  },
  cancellation: {
    typeCode: "381",
    title: "Stornorechnung",
    numberLabel: "Rechnungsnr.",
    isInvoiceLike: true,
  },
  quote: { typeCode: "", title: "Angebot", numberLabel: "Angebotsnr.", isInvoiceLike: false },
  order_confirmation: {
    typeCode: "",
    title: "Auftragsbestätigung",
    numberLabel: "Auftragsnr.",
    isInvoiceLike: false,
  },
  delivery_note: {
    typeCode: "",
    title: "Lieferschein",
    numberLabel: "Lieferscheinnr.",
    isInvoiceLike: false,
  },
};

export function documentTypeInfo(type: string): DocTypeInfo {
  return (
    DOC_TYPES[type] ??
    { typeCode: "380", title: "Beleg", numberLabel: "Beleg-Nr.", isInvoiceLike: true }
  );
}

/**
 * Platzhalter für die Nummer eines Entwurfs, nur im XML (BT-1 darf dort nicht
 * leer sein). Im PDF bleibt die Nummer eines Entwurfs leer (Owner 17.10.2026).
 */
export const DRAFT_NUMBER = "ENTWURF";

// ---------------------------------------------------------------------------
// Steuerkategorien und Pflichttexte
// ---------------------------------------------------------------------------

const TAX_MODES: TaxMode[] = ["standard", "reverse_charge", "small_business", "tax_free"];

export function toTaxMode(value: string | null | undefined, fallback: TaxMode = "standard"): TaxMode {
  const raw = (value ?? "").trim();
  return (TAX_MODES as string[]).includes(raw) ? (raw as TaxMode) : fallback;
}

/** BT-118 / BT-151 aus Steuermodus + Satz. */
export function taxCategoryFor(mode: TaxMode, ratePercent: number): TaxCategoryCode {
  if (mode === "small_business" || mode === "tax_free") return "E";
  if (mode === "reverse_charge") return "AE";
  return ratePercent > 0 ? "S" : "Z";
}

/**
 * BT-120 Befreiungsgrund. Texte stammen aus `app/lib/finance/tax/hints.ts`
 * (dort `severity: 'required'`), damit PDF und XML dieselbe Formulierung tragen.
 * `S` und `Z` dürfen laut BR-S-10 / BR-Z-10 keinen Grund tragen.
 */
export function exemptionReasonFor(
  category: TaxCategoryCode,
  mode: TaxMode,
  country: CountryIso,
): string | null {
  if (category === "AE") {
    return country === "AT"
      ? "Übergang der Steuerschuld gemäß § 19 Abs. 1a UStG."
      : "Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG.";
  }
  if (category === "E") {
    if (mode === "small_business") {
      return country === "AT"
        ? "Umsatzsteuerfreie Leistung gemäß § 6 Abs. 1 Z 27 UStG (Kleinunternehmerregelung)."
        : "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";
    }
    return "Steuerfreie Leistung.";
  }
  return null;
}

/**
 * Port von `buildTaxHints` (app/lib/finance/tax/hints.ts) — nur die Texte,
 * die auf dem Beleg stehen müssen bzw. sollen. Reihenfolge identisch zur App.
 */
export function buildTaxHintTexts(ctx: {
  country: CountryIso;
  taxMode: TaxMode;
  customerType: "b2b" | "b2c";
  isConstructionBusiness: boolean;
  hasValidTaxExemption: boolean;
  hasLaborShare: boolean;
}): string[] {
  const hints: string[] = [];

  if (ctx.taxMode === "small_business") {
    if (ctx.country === "DE") {
      hints.push("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");
    } else if (ctx.country === "AT") {
      hints.push(
        "Umsatzsteuerfreie Leistung gemäß § 6 Abs. 1 Z 27 UStG (Kleinunternehmerregelung).",
      );
    }
  }

  if (ctx.taxMode === "reverse_charge") {
    if (ctx.country === "DE") {
      hints.push("Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG.");
    } else if (ctx.country === "AT") {
      hints.push("Übergang der Steuerschuld gemäß § 19 Abs. 1a UStG.");
    }
  }

  if (ctx.country === "DE" && ctx.customerType === "b2c" && ctx.hasLaborShare) {
    hints.push(
      "Im Rechnungsbetrag sind Arbeitskosten enthalten. Privatkunden können gemäß § 35a EStG 20 % der Arbeitskosten (max. 1.200 €/Jahr) steuerlich geltend machen, sofern die Zahlung unbar erfolgt.",
    );
  }

  if (ctx.country === "DE" && ctx.customerType === "b2c") {
    hints.push(
      "Der Leistungsempfänger ist gemäß § 14 Abs. 4 Nr. 9 UStG verpflichtet, diese Rechnung zwei Jahre aufzubewahren.",
    );
  }

  if (
    ctx.country === "DE" &&
    ctx.customerType === "b2b" &&
    ctx.isConstructionBusiness &&
    !ctx.hasValidTaxExemption
  ) {
    hints.push(
      "Keine gültige Freistellungsbescheinigung hinterlegt. Der Auftraggeber kann verpflichtet sein, 15 % Bauabzugsteuer gemäß § 48 EStG einzubehalten.",
    );
  }

  return hints;
}

// ---------------------------------------------------------------------------
// Datum
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDate(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (ISO_DATE.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Hauptabbildung
// ---------------------------------------------------------------------------

function cleanText(value: string | null | undefined): string {
  // Steuerzeichen entfernen (außer Zeilenumbruch), NBSP vereinheitlichen.
  return (value ?? "")
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .trim();
}

type SellerSource = Pick<
  CompanyRow,
  | "name"
  | "street_address"
  | "postal_code"
  | "city"
  | "country"
  | "vat_id"
  | "tax_number"
  | "trade_register"
  | "email"
  | "phone_number"
  | "iban"
  | "bic"
  | "bank_name"
>;

/**
 * Verkäufer des Belegs. Festgeschrieben: die Kopie im Beleg, damit eine
 * spätere Änderung am Betrieb das Original nicht verändert (GoBD). Entwurf
 * und Belege, die vor der Kopie festgeschrieben wurden: live aus `companies`.
 */
function resolveSellerSource(doc: SalesDocRow, company: CompanyRow | null): SellerSource | null {
  if (doc.status !== "draft" && cleanText(doc.seller_name)) {
    return {
      name: doc.seller_name ?? null,
      street_address: doc.seller_street ?? null,
      postal_code: doc.seller_postal_code ?? null,
      city: doc.seller_city ?? null,
      country: doc.seller_country ?? null,
      vat_id: doc.seller_vat_id ?? null,
      tax_number: doc.seller_tax_number ?? null,
      trade_register: doc.seller_trade_register ?? null,
      email: doc.seller_email ?? null,
      phone_number: doc.seller_phone ?? null,
      iban: doc.seller_iban ?? null,
      bic: doc.seller_bic ?? null,
      bank_name: doc.seller_bank_name ?? null,
    };
  }
  return company;
}

function personName(contact: ContactRow): string {
  return [contact.first_name, contact.last_name]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function buyerDisplayName(contact: ContactRow | null): string {
  if (!contact) return "";
  if (contact.kind === "person") return personName(contact);
  return cleanText(contact.company_name) || personName(contact);
}

/**
 * Käufer des Belegs. Festgeschrieben: die Kopie im Beleg. Entwurf: live aus
 * Kontakt und Kundenrolle, Rechnungsadresse vor Hauptadresse — dieselbe Regel
 * wie `sales_document_buyer_snapshot` in der Datenbank.
 */
function resolveBuyer(doc: SalesDocRow, customer: CustomerRow | null): BuyerParty {
  if (doc.status !== "draft" && cleanText(doc.buyer_name)) {
    return {
      name: cleanText(doc.buyer_name),
      address: {
        line1: cleanText(doc.buyer_street),
        postcode: cleanText(doc.buyer_postal_code),
        city: cleanText(doc.buyer_city),
        countryCode: toCountryCode(doc.buyer_country),
      },
      vatId: cleanText(doc.buyer_vat_id) || null,
      customerNumber: cleanText(doc.buyer_customer_number) || null,
      contactName: cleanText(doc.buyer_contact_name) || null,
      email: cleanText(doc.buyer_email) || null,
    };
  }

  const contact = customer?.contact ?? null;
  const profile = customer?.profile ?? null;
  const useBillingAddress = Boolean(cleanText(profile?.billing_street));
  return {
    // Ohne Kunde bleibt der Name leer statt eines Platzhalters.
    name: buyerDisplayName(contact),
    address: {
      line1: useBillingAddress
        ? cleanText(profile?.billing_street)
        : cleanText(contact?.street_address),
      postcode: useBillingAddress
        ? cleanText(profile?.billing_postal_code)
        : cleanText(contact?.postal_code),
      city: useBillingAddress ? cleanText(profile?.billing_city) : cleanText(contact?.city),
      countryCode: toCountryCode(
        useBillingAddress && cleanText(profile?.billing_country)
          ? profile?.billing_country
          : contact?.country,
      ),
    },
    vatId: cleanText(contact?.vat_id) || null,
    customerNumber: cleanText(profile?.customer_number) || null,
    // BT-56: bei Firmen der Name der Person, die als Ansprechpartner am
    // Kontakt steht.
    contactName: contact && contact.kind !== "person" ? personName(contact) || null : null,
    email: cleanText(contact?.email) || null,
  };
}

export function buildInvoiceData(input: {
  doc: SalesDocRow;
  lines: SalesLineRow[];
  company: CompanyRow | null;
  customer: CustomerRow | null;
  /** Ursprungsbeleg (`parent_document_id`) für BT-25. */
  parent?: ParentDocRow | null;
  /** Abschläge, auf die Positionen der Schlussrechnung verweisen. */
  credited?: CreditedDocRow[];
  /** Typcodes aus `sales_document_type_codes`, Schlüssel = Belegart. */
  typeCodes?: Record<string, string>;
  /** Rechnungsvorlage des Belegs bzw. Standardvorlage des Betriebs. */
  template?: InvoiceTemplateRow | null;
  today?: string;
}): InvoiceData {
  const { doc, company, customer } = input;
  const warnings: string[] = [];
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  const typeInfo = documentTypeInfo(doc.type);
  const typeCode = input.typeCodes?.[doc.type] || typeInfo.typeCode;
  const einvoiceFormat: EInvoiceFormat = doc.einvoice_format === "xrechnung"
    ? "xrechnung"
    : "zugferd";
  const sellerSource = resolveSellerSource(doc, company);
  const sellerCountryIso = toFinanceCountryIso(sellerSource?.country);
  const docTaxMode = toTaxMode(doc.tax_mode);
  const currency = (doc.currency || company?.currency || "EUR").trim().toUpperCase();

  // --- Positionen -----------------------------------------------------------
  const sorted = [...input.lines].sort(
    (a, b) => toNumber(a.sort_order) - toNumber(b.sort_order),
  );

  let lineCounter = 0;
  const lines: RenderLine[] = sorted.map((row) => {
    const isText = (row.kind ?? "") === "text";
    const lineMode = toTaxMode(row.tax_category, docTaxMode);
    const rawRate = toNumber(row.tax_rate_percent);
    const category = taxCategoryFor(lineMode, rawRate);
    // Bei E / AE / Z ist der Satz zwingend 0 (BR-E-5 / BR-AE-5 / BR-Z-5).
    const ratePercent = category === "S" ? rawRate : 0;
    const quantity = toNumber(row.quantity);
    const unitPriceCents = toCents(row.unit_price);
    const netAmountCents = toCents(row.net_amount);
    const grossLineCents = roundHalfAwayFromZero(unitPriceCents * quantity);
    const allowanceCents = isText ? 0 : grossLineCents - netAmountCents;

    return {
      lineId: isText ? null : ++lineCounter,
      isText,
      isPartialCredit: row.kind === "partial_credit",
      name: cleanText(row.title) || cleanText(row.description) || "Position",
      description: cleanText(row.title) ? cleanText(row.description) : "",
      quantity,
      unitLabel: cleanText(row.unit),
      unitCode: toUnitCode(row.unit),
      unitPriceCents,
      netAmountCents: isText ? 0 : netAmountCents,
      allowanceCents,
      discountPercent: toNumber(row.discount_percent),
      taxRatePercent: ratePercent,
      taxCategory: category,
    };
  });

  const monetaryLines = lines.filter((l) => !l.isText);
  if (monetaryLines.length === 0) {
    warnings.push("Beleg enthält keine berechenbare Position (BR-16 verlangt mindestens eine).");
  }

  // --- USt-Aufschlüsselung (BG-23), einmal pro Gruppe gerundet --------------
  const groupMap = new Map<string, TaxBreakdownGroup>();
  for (const line of monetaryLines) {
    const key = `${line.taxCategory}|${line.taxRatePercent}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.basisCents += line.netAmountCents;
    } else {
      groupMap.set(key, {
        categoryCode: line.taxCategory,
        ratePercent: line.taxRatePercent,
        basisCents: line.netAmountCents,
        taxCents: 0,
        exemptionReason: exemptionReasonFor(line.taxCategory, docTaxMode, sellerCountryIso),
      });
    }
  }
  const taxBreakdown = [...groupMap.values()]
    .map((g) => ({ ...g, taxCents: percentOfCents(g.basisCents, g.ratePercent) }))
    .sort((a, b) => a.ratePercent - b.ratePercent || a.categoryCode.localeCompare(b.categoryCode));

  // --- Summen (BG-22) -------------------------------------------------------
  const lineTotalCents = monetaryLines.reduce((s, l) => s + l.netAmountCents, 0);
  const taxTotalCents = taxBreakdown.reduce((s, g) => s + g.taxCents, 0);
  const totals: DocumentTotals = {
    lineTotalCents,
    // Nachlässe stecken bereits in BT-131 der jeweiligen Position,
    // deshalb keine Dokument-Nachlässe (BT-107/BT-108).
    allowanceTotalCents: 0,
    chargeTotalCents: 0,
    taxBasisTotalCents: lineTotalCents,
    taxTotalCents,
    grandTotalCents: lineTotalCents + taxTotalCents,
    prepaidCents: 0,
    duePayableCents: lineTotalCents + taxTotalCents,
  };

  const storedNet = toCents(doc.net_total);
  const storedGross = toCents(doc.gross_total);
  if (storedNet !== totals.taxBasisTotalCents || storedGross !== totals.grandTotalCents) {
    warnings.push(
      `Gespeicherte Summen weichen von der Positionssumme ab (gespeichert netto ${storedNet} / brutto ${storedGross} Cent, berechnet netto ${totals.taxBasisTotalCents} / brutto ${totals.grandTotalCents} Cent). Beleg und XML nutzen die berechneten Werte, damit die EN16931-Summenregeln aufgehen.`,
    );
  }

  // --- Zahlung --------------------------------------------------------------
  // Ein Entwurf ohne Datum bekommt beim Festschreiben das heutige
  // (`coalesce(issue_date, CURRENT_DATE)`), nicht sein Anlagedatum. Sonst
  // zeigte die Vorschau ein anderes Datum als das Original (bautakt-web#217).
  const issueDate = normalizeDate(doc.issue_date) ??
    (doc.status === "draft" ? null : normalizeDate(doc.created_at)) ?? today;
  // Fälligkeit: Seit bautakt-web#223 speichert `finalize_sales_document`
  // `due_date` und `payment_term_days` am Beleg, mit genau dieser Regel
  // (Beleg, sonst Kunde, sonst Betrieb). Ein festgeschriebener Beleg liest
  // damit nur seine eigenen Werte. Gerechnet wird hier nur noch für die
  // Entwurfs-Vorschau und für Belege, die vor #223 ohne Datum festgeschrieben
  // wurden. Ändert sich die Regel, beide Stellen anpassen.
  const paymentTermDays =
    doc.payment_term_days ??
    customer?.profile.payment_term_days ??
    company?.payment_term_days ??
    null;
  // Eine Gutschrift wird nicht gezahlt, sondern mit ihrer Rechnung verrechnet
  // (bautakt-web#78): kein Fälligkeitsdatum, kein Skonto.
  const isCreditNote = doc.type === "credit_note";
  const dueDate = isCreditNote
    ? null
    : normalizeDate(doc.due_date) ??
      (paymentTermDays != null ? addDays(issueDate, paymentTermDays) : null);

  // Skonto gilt nur mit Prozent und Frist. Es rechnet sich auf den Zahlbetrag
  // (BT-115) — so liest es auch die XRechnung ohne BASISBETRAG.
  const rawSkontoPercent = toNumber(doc.skonto_percent);
  const hasSkonto =
    !isCreditNote && rawSkontoPercent > 0 && doc.skonto_days != null && doc.skonto_days > 0;
  const skontoPercent = hasSkonto ? rawSkontoPercent : null;
  const skontoDays = hasSkonto ? doc.skonto_days : null;
  const skontoAmountCents =
    skontoPercent != null ? percentOfCents(totals.duePayableCents, skontoPercent) : null;

  // Netto-Teil der Zahlungsbedingung, z. B. „bis 16.11.2026 ohne Abzug“.
  const netTerm = dueDate
    ? `bis ${formatGermanDate(dueDate)} ohne Abzug`
    : paymentTermDays != null
      ? `innerhalb von ${paymentTermDays} Tagen ohne Abzug`
      : null;

  const termsParts: string[] = [];
  const parentNumber = cleanText(input.parent?.document_number);
  if (isCreditNote) {
    termsParts.push(
      parentNumber
        ? `Der Betrag wird mit Rechnung ${parentNumber} verrechnet.`
        : "Der Betrag wird mit der zugehörigen Rechnung verrechnet.",
    );
  } else if (skontoPercent != null && skontoDays != null) {
    const skontoTerm = `innerhalb von ${skontoDays} Tagen (bis ${formatGermanDate(
      addDays(issueDate, skontoDays),
    )}) mit ${formatGermanNumber(skontoPercent, skontoPercent % 1 === 0 ? 0 : 2)} % Skonto`;
    termsParts.push(
      netTerm ? `Zahlbar ${skontoTerm}, ${netTerm}.` : `Zahlbar ${skontoTerm}.`,
    );
  } else if (netTerm) {
    termsParts.push(`Zahlbar ${netTerm}.`);
  } else {
    termsParts.push("Zahlbar sofort ohne Abzug.");
  }

  const payment: PaymentInfo = {
    termsText: termsParts.join(" "),
    dueDate,
    paymentTermDays,
    skontoPercent,
    skontoDays,
    skontoAmountCents,
    skontoGrossCents:
      skontoAmountCents != null ? totals.duePayableCents - skontoAmountCents : null,
  };

  // --- Parteien -------------------------------------------------------------
  const seller: SellerParty = {
    name: cleanText(sellerSource?.name) || "—",
    address: {
      line1: cleanText(sellerSource?.street_address),
      postcode: cleanText(sellerSource?.postal_code),
      city: cleanText(sellerSource?.city),
      countryCode: toCountryCode(sellerSource?.country),
    },
    vatId: cleanText(sellerSource?.vat_id) || null,
    taxNumber: cleanText(sellerSource?.tax_number) || null,
    tradeRegister: cleanText(sellerSource?.trade_register) || null,
    email: cleanText(sellerSource?.email) || null,
    phone: cleanText(sellerSource?.phone_number) || null,
    iban: cleanText(sellerSource?.iban) || null,
    bic: cleanText(sellerSource?.bic) || null,
    bankName: cleanText(sellerSource?.bank_name) || null,
    countryIso: sellerCountryIso,
  };

  const buyer = resolveBuyer(doc, customer);

  const isDraft = doc.status === "draft";

  // --- Rechnungsbezug (BG-3) ------------------------------------------------
  // Original von Storno/Gutschrift, dann die Abschläge in Positionsreihenfolge.
  const creditedById = new Map((input.credited ?? []).map((row) => [row.id, row]));
  const creditedInOrder = sorted.flatMap((row) => {
    const credited = row.credited_document_id ? creditedById.get(row.credited_document_id) : null;
    return credited ? [credited] : [];
  });
  const precedingInvoices: InvoiceData["precedingInvoices"] = [];
  for (const ref of [input.parent, ...creditedInOrder]) {
    const number = cleanText(ref?.document_number);
    if (!number || precedingInvoices.some((p) => p.number === number)) continue;
    precedingInvoices.push({ number, issueDate: normalizeDate(ref?.issue_date) });
  }
  if (
    !cleanText(input.parent?.document_number) &&
    (doc.type === "cancellation" || doc.type === "credit_note")
  ) {
    warnings.push("BT-25: Ursprungsrechnung fehlt oder hat keine Nummer — Bezug entfällt.");
  }

  // --- Verrechnung der Abschläge (§ 14 Abs. 5 UStG) ---------------------------
  // Gesamtleistung = alle Positionen ohne Abschlagsabzug. Die USt der Abzüge
  // ist die Differenz zur USt des Belegs, damit Restbetrag und XML-Summen
  // centgenau zusammenpassen.
  let settlement: InvoiceData["settlement"] = null;
  const creditLines = monetaryLines.filter((l) => l.isPartialCredit);
  if (creditLines.length > 0) {
    const serviceGroups = new Map<string, { ratePercent: number; basisCents: number }>();
    for (const line of monetaryLines.filter((l) => !l.isPartialCredit)) {
      const key = `${line.taxCategory}|${line.taxRatePercent}`;
      const group = serviceGroups.get(key) ?? { ratePercent: line.taxRatePercent, basisCents: 0 };
      group.basisCents += line.netAmountCents;
      serviceGroups.set(key, group);
    }
    const totalTax = [...serviceGroups.values()]
      .map((g) => ({
        ratePercent: g.ratePercent,
        taxCents: percentOfCents(g.basisCents, g.ratePercent),
      }))
      .sort((a, b) => a.ratePercent - b.ratePercent);
    const totalNetCents = [...serviceGroups.values()].reduce((s, g) => s + g.basisCents, 0);
    const totalTaxCents = totalTax.reduce((s, g) => s + g.taxCents, 0);
    settlement = {
      totalNetCents,
      totalTax,
      totalGrossCents: totalNetCents + totalTaxCents,
      creditNetCents: creditLines.reduce((s, l) => s + l.netAmountCents, 0),
      creditTaxCents: totals.taxTotalCents - totalTaxCents,
    };
  }

  // --- Pflichtfeld-Prüfungen (EN16931 / § 14 UStG) --------------------------
  // Ein Entwurf hat nie eine Nummer, die vergibt erst das Festschreiben.
  if (!isDraft && !cleanText(doc.document_number)) {
    warnings.push("BT-1: Belegnummer fehlt — fortlaufende Nummer ist Pflicht (§ 14 UStG).");
  }
  if (!seller.vatId && !seller.taxNumber) {
    warnings.push(
      "BT-31/BT-32: Weder USt-IdNr. noch Steuernummer am Unternehmen hinterlegt — EN16931 (BR-CO-26) und § 14 UStG verlangen mindestens eine davon.",
    );
  }
  if (seller.vatId && !seller.vatId.toUpperCase().startsWith(seller.address.countryCode)) {
    warnings.push(
      "BT-31: USt-IdNr. beginnt nicht mit dem Länderpräfix des Verkäufers (BR-CO-9).",
    );
  }
  if (!seller.address.line1 || !seller.address.city || !seller.address.postcode) {
    warnings.push("BG-5: Anschrift des Verkäufers unvollständig (Straße/PLZ/Ort).");
  }
  if (!buyer.address.line1 || !buyer.address.city || !buyer.address.postcode) {
    warnings.push("BG-8: Anschrift des Käufers unvollständig (Straße/PLZ/Ort).");
  }
  if (!customer && !cleanText(doc.buyer_name)) {
    warnings.push("BT-44: Kein Kunde am Beleg verknüpft — Empfängerdaten fehlen vollständig.");
  }
  if (docTaxMode === "reverse_charge" && !buyer.vatId) {
    warnings.push(
      "BT-48: Reverse Charge (§ 13b UStG) ohne USt-IdNr. des Empfängers — EN16931 BR-AE-3 verlangt sie.",
    );
  }
  if (!normalizeDate(doc.service_date)) {
    warnings.push(
      "BT-72: Leistungsdatum fehlt — § 14 Abs. 4 Nr. 6 UStG verlangt Zeitpunkt oder Zeitraum der Leistung.",
    );
  }

  // XRechnung (CIUS 3.0): ohne diese Angaben lehnt jede Eingangsstelle ab.
  // Die Sperre beim Freigeben ist `sales_documents_check_xrechnung`.
  if (einvoiceFormat === "xrechnung" && typeInfo.isInvoiceLike && doc.e_invoice !== false) {
    if (!cleanText(doc.buyer_reference)) {
      warnings.push("BT-10: XRechnung ohne Leitweg-ID (Käuferreferenz) — BR-DE-15.");
    }
    if (!seller.email || !seller.phone) {
      warnings.push("BG-6: XRechnung braucht E-Mail und Telefon des Verkäufers — BR-DE-2.");
    }
    if (!buyer.email) {
      warnings.push("BT-49: XRechnung braucht die E-Mail-Adresse des Käufers — PEPPOL-EN16931-R010.");
    }
  }

  // Privatperson = b2c (§ 35a-Hinweis, Aufbewahrungspflicht). Ob jemand Kunde
  // ist, steckt in der Rolle; ob privat, in der Art des Kontakts.
  const customerType = customer?.contact.kind === "person" ? "b2c" : "b2b";
  const hasValidTaxExemption = Boolean(
    customer?.profile.tax_exemption_valid_until &&
      customer.profile.tax_exemption_valid_until >= today,
  );

  // --- Vorlage ---------------------------------------------------------------
  // Beide Felder nur, wenn gesetzt: ein Standardbeleg behält damit exakt
  // seinen bisherigen Fingerabdruck.
  const subject = cleanText(doc.subject);
  const letterhead = resolveLetterhead(input.template, doc.type, warnings);
  if (letterhead && !letterhead.legalLine) {
    letterhead.legalLine = composeLegalLine(company, seller);
  }

  return {
    ...(subject ? { subject } : {}),
    ...(letterhead ? { layout: letterhead } : {}),
    documentId: doc.id,
    documentNumber: isDraft ? "" : cleanText(doc.document_number) || doc.id,
    // BT-10: leer heisst "nicht gesetzt" — das CII laesst das Element dann weg.
    buyerReference: cleanText(doc.buyer_reference),
    typeCode,
    einvoiceFormat,
    precedingInvoices,
    settlement,
    documentTitle: typeInfo.title,
    numberLabel: typeInfo.numberLabel,
    documentType: doc.type,
    isInvoiceLike: typeInfo.isInvoiceLike,
    isDraft,
    issueDate,
    serviceDate: normalizeDate(doc.service_date),
    currency,
    taxMode: docTaxMode,
    seller,
    buyer,
    lines,
    taxBreakdown,
    totals,
    payment,
    introText: cleanText(doc.intro_text),
    footerText: cleanText(doc.footer_text),
    notes: cleanText(doc.notes),
    taxHints: buildTaxHintTexts({
      country: sellerCountryIso,
      taxMode: docTaxMode,
      customerType,
      isConstructionBusiness: Boolean(customer?.profile.is_construction_business),
      hasValidTaxExemption,
      hasLaborShare: toCents(doc.labor_share) > 0,
    }),
    // Rohwert; die Pruefung auf #RRGGBB macht pdf.ts (mit Fallback + Warnung).
    accentColorHex: cleanText(company?.invoice_accent_color),
    warnings,
  };
}

/**
 * Rechtsangaben für den Briefbogen-Fuß: „Amtsgericht Stuttgart · HRB 290382 ·
 * Geschäftsführer A und B · Steuer-Nr. …“. Nur, was am Betrieb gepflegt ist.
 */
function composeLegalLine(company: CompanyRow | null, seller: SellerParty): string {
  const directors = (company?.managing_directors ?? []).map(cleanText).filter(Boolean);
  const directorText = directors.length > 1
    ? `${directors.slice(0, -1).join(", ")} und ${directors[directors.length - 1]}`
    : directors[0] ?? "";
  return [
    cleanText(company?.register_court),
    seller.tradeRegister ?? "",
    directorText ? `Geschäftsführer ${directorText}` : "",
    seller.taxNumber ? `Steuer-Nr. ${seller.taxNumber}` : "",
    seller.vatId ? `USt-IdNr. ${seller.vatId}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Formatierung (deutsche Belegsprache)
// ---------------------------------------------------------------------------

export function formatGermanDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Deutsche Zahlformatierung ohne Intl-Abhängigkeit (Edge-Runtime-sicher). */
export function formatGermanNumber(value: number, decimals: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = Math.abs(safe).toFixed(decimals);
  const [intPart, fracPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = safe < 0 ? "-" : "";
  return fracPart ? `${sign}${grouped},${fracPart}` : `${sign}${grouped}`;
}

export function formatCents(cents: number, currency: string): string {
  const symbol = currency === "CHF" ? "CHF" : "€";
  const value = formatGermanNumber(cents / 100, 2);
  return currency === "CHF" ? `${symbol} ${value}` : `${value} ${symbol}`;
}

/** Menge mit bis zu 4 Nachkommastellen, ohne unnötige Nullen. */
export function formatQuantity(value: number): string {
  const rounded = Math.round((Number.isFinite(value) ? value : 0) * 10000) / 10000;
  const decimals = Number.isInteger(rounded) ? 0 : rounded * 100 % 1 === 0 ? 2 : 4;
  return formatGermanNumber(rounded, decimals);
}
