import type { LetterheadLayout } from "./template.ts";

/**
 * Gemeinsame Datenstruktur für XML- und PDF-Erzeugung.
 *
 * Alle Geldbeträge sind **Minor Units (Cent)** als Ganzzahl — identisch zur
 * App-Konvention in `app/lib/finance/money.ts`. Die Datenbank speichert dagegen
 * Major Units (numeric(14,2)); die Umrechnung passiert einmalig in `mapping.ts`.
 */

/** EN16931 BT-151 / BT-118 — Umsatzsteuerkategorie (UNTDID 5305, EN16931-Subset). */
export type TaxCategoryCode = "S" | "Z" | "E" | "AE" | "O";

/** Steuermodus wie in `sales_documents.tax_mode` / `sales_document_lines.tax_category`. */
export type TaxMode = "standard" | "reverse_charge" | "small_business" | "tax_free";

export type CountryIso = "DE" | "AT" | "CH";

export type PostalAddress = {
  /** BT-35 / BT-50 */
  line1: string;
  /** BT-38 / BT-53 */
  postcode: string;
  /** BT-37 / BT-52 */
  city: string;
  /** BT-40 / BT-55 — ISO 3166-1 alpha-2, Pflicht in EN16931 */
  countryCode: string;
};

export type EInvoiceFormat = "zugferd" | "xrechnung";

export type SellerParty = {
  /** BT-27 */
  name: string;
  address: PostalAddress;
  /** BT-31 — USt-IdNr. */
  vatId: string | null;
  /** BT-32 — Steuernummer (schemeID FC) */
  taxNumber: string | null;
  /** BT-30 — Handelsregistereintrag */
  tradeRegister: string | null;
  /** BT-43 */
  email: string | null;
  phone: string | null;
  /** BT-84 / BT-86 / BT-85 */
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  countryIso: CountryIso;
};

export type BuyerParty = {
  /** BT-44 */
  name: string;
  address: PostalAddress;
  /** BT-48 */
  vatId: string | null;
  /** BT-46 — Kundennummer beim Verkäufer */
  customerNumber: string | null;
  contactName: string | null;
  email: string | null;
};

export type RenderLine = {
  /**
   * BT-126 Positionsnummer. `null` für reine Textzeilen (`kind = 'text'`) —
   * die tauchen nur im PDF auf, nicht als BG-25 im XML (sie tragen keine Beträge).
   */
  lineId: number | null;
  isText: boolean;
  /** Abzug eines Abschlags in der Schlussrechnung (`kind = 'partial_credit'`). */
  isPartialCredit: boolean;
  /** BT-153 */
  name: string;
  /** BT-154 */
  description: string;
  /** BT-129 */
  quantity: number;
  /** Rohwert aus `sales_document_lines.unit` (z. B. "Std.") — nur fürs PDF. */
  unitLabel: string;
  /** BT-130 — UN/ECE Rec. 20 Code */
  unitCode: string;
  /** BT-146 — Einzelpreis netto in Cent */
  unitPriceCents: number;
  /** BT-131 — Positionsbetrag netto in Cent */
  netAmountCents: number;
  /**
   * BT-136 (Nachlass, positiv) bzw. BT-141 (Zuschlag, negativ) in Cent.
   * Differenz zwischen `quantity * unitPrice` und dem gespeicherten Nettobetrag.
   */
  allowanceCents: number;
  discountPercent: number;
  /** BT-152 */
  taxRatePercent: number;
  /** BT-151 */
  taxCategory: TaxCategoryCode;
};

/** BG-23 — USt-Aufschlüsselung je Kategorie/Satz. */
export type TaxBreakdownGroup = {
  /** BT-118 */
  categoryCode: TaxCategoryCode;
  /** BT-119 */
  ratePercent: number;
  /** BT-116 */
  basisCents: number;
  /** BT-117 */
  taxCents: number;
  /** BT-120 — Pflicht bei E und AE, verboten bei S und Z */
  exemptionReason: string | null;
};

/** BG-22 — Dokumentsummen. */
export type DocumentTotals = {
  /** BT-106 */
  lineTotalCents: number;
  /** BT-107 */
  allowanceTotalCents: number;
  /** BT-108 */
  chargeTotalCents: number;
  /** BT-109 */
  taxBasisTotalCents: number;
  /** BT-110 */
  taxTotalCents: number;
  /** BT-112 */
  grandTotalCents: number;
  /** BT-113 */
  prepaidCents: number;
  /** BT-115 */
  duePayableCents: number;
};

export type PaymentInfo = {
  /** BT-20 — Zahlungsbedingungen als Klartext */
  termsText: string;
  /** BT-9 */
  dueDate: string | null;
  paymentTermDays: number | null;
  skontoPercent: number | null;
  skontoDays: number | null;
  /** Skonto-Betrag in Cent (nur Anzeige, mindert die Forderung nicht). */
  skontoAmountCents: number | null;
  /** Skonto-Zahlbetrag in Cent. */
  skontoGrossCents: number | null;
};

export type InvoiceData = {
  documentId: string;
  /** BT-1 */
  documentNumber: string;
  /**
   * BT-10 Käuferreferenz — bei öffentlichen Auftraggebern die Leitweg-ID.
   * Ohne sie ist eine XRechnung an öffentliche Auftraggeber nicht zustellbar
   * (BR-DE-15). Leerer String = nicht gesetzt; das Element entfällt dann im CII.
   */
  buyerReference: string;
  /** BT-3 — UNTDID 1001 */
  typeCode: string;
  /**
   * Format der E-Rechnung (bautakt-web#184). `xrechnung` setzt im CII die
   * Kennung der deutschen CIUS (BT-24) samt Geschäftsprozess (BT-23) und
   * bettet das XML als `xrechnung.xml` ein (ZUGFeRD-Profil XRECHNUNG).
   */
  einvoiceFormat: EInvoiceFormat;
  /**
   * BG-3 Bezüge auf vorausgegangene Rechnungen (BT-25 Nummer, BT-26 Datum):
   * bei Storno und Gutschrift das Original, bei der Schlussrechnung jeder
   * abgezogene Abschlag. Leer = kein Bezug.
   */
  precedingInvoices: { number: string; issueDate: string | null }[];
  /**
   * Verrechnung der Schlussrechnung (§ 14 Abs. 5 UStG): Gesamtleistung und
   * abgezogene Abschläge, je netto und USt. Nur gesetzt, wenn der Beleg
   * Abschlagsabzüge (`partial_credit`) hat. Die Abzüge sind negativ.
   */
  settlement: {
    totalNetCents: number;
    totalTax: { ratePercent: number; taxCents: number }[];
    totalGrossCents: number;
    creditNetCents: number;
    creditTaxCents: number;
  } | null;
  /** Deutscher Belegtitel für das PDF, z. B. "Rechnung". */
  documentTitle: string;
  /** Beschriftung des Nummernfelds im Kopf, z. B. "Rechnungsnr.". */
  numberLabel: string;
  /** Belegart aus der Datenbank. */
  documentType: string;
  /**
   * Nur rechnungsartige Belege bekommen ein eingebettetes Factur-X-XML.
   * Angebot / Auftragsbestätigung / Lieferschein sind keine E-Rechnungen.
   */
  isInvoiceLike: boolean;
  /**
   * Entwurf: Die Nummer bleibt im PDF leer, ohne Platzhalter und ohne
   * Wasserzeichen (Owner 17.10.2026). Nur darin weicht die Vorschau vom
   * festgeschriebenen PDF ab (Recht R2, bautakt-web#152).
   */
  isDraft: boolean;
  /** BT-2 (YYYY-MM-DD) */
  issueDate: string;
  /** BT-72 Leistungsdatum (YYYY-MM-DD) */
  serviceDate: string | null;
  /** BT-5 */
  currency: string;
  taxMode: TaxMode;
  seller: SellerParty;
  buyer: BuyerParty;
  lines: RenderLine[];
  taxBreakdown: TaxBreakdownGroup[];
  totals: DocumentTotals;
  payment: PaymentInfo;
  /** BT-22 — Freitexte (Einleitung, Notiz, Fußtext, Steuerpflichttexte). */
  introText: string;
  footerText: string;
  notes: string;
  /** Pflicht-/Hinweistexte aus `app/lib/finance/tax/hints.ts`. */
  taxHints: string[];
  /**
   * Rohwert aus `companies.invoice_accent_color` (`#RRGGBB`, leer = Standard).
   *
   * Reine Layout-Angabe, kein EN16931-Feld — sie steht hier aus demselben Grund
   * wie `documentTitle` oder `unitLabel`: derselbe Weg DB → Mapping → PDF.
   * Geprüft wird der Wert erst in `pdf.ts`; alles, was nicht exakt `#RRGGBB`
   * ist, fällt dort auf die Standardfarbe zurück und erzeugt eine Warnung —
   * ein Tippfehler in den Firmeneinstellungen darf keinen Beleg verhindern.
   */
  accentColorHex: string;
  /** Warnungen für den Aufrufer (fehlende Pflichtfelder o. Ä.). */
  warnings: string[];
  /**
   * Betreff / Bauvorhaben über dem Belegtitel (`sales_documents.subject`).
   * Fehlt, wenn leer — so bleibt der Fingerabdruck alter Belege gleich.
   */
  subject?: string;
  /**
   * Briefbogen aus der Rechnungsvorlage (`invoice_templates`, Layout
   * `letterhead`). Fehlt beim Standardlayout.
   */
  layout?: LetterheadLayout;
};

export type PdfAssets = {
  regularFont: Uint8Array;
  semiBoldFont: Uint8Array;
  iccProfile: Uint8Array;
  /** Optionales Firmenlogo (PNG oder JPEG). Fehlt es, wird ohne Logo gerendert. */
  logo?: { bytes: Uint8Array; mime: string } | null;
};
