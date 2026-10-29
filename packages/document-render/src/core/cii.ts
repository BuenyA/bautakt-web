/**
 * CII / Factur-X XML nach EN16931 (Profil "EN 16931" / Comfort).
 *
 * Reine Funktion: `InvoiceData` rein, XML-String raus. Keine Supabase-,
 * Deno- oder Node-Abhaengigkeit, damit die Ausgabe ohne Netz gegen den
 * Mustang-Validator gefahren werden kann.
 *
 * Die Elementreihenfolge folgt dem CII-Schema (UN/CEFACT D16B) — sie ist dort
 * verbindlich (xsd:sequence), nicht kosmetisch. Nicht umsortieren.
 */

import { DRAFT_NUMBER } from "./mapping.ts";
import type { InvoiceData, PostalAddress, RenderLine, TaxBreakdownGroup } from "./types.ts";

export const EN16931_GUIDELINE_ID = "urn:cen.eu:en16931:2017";
/** BT-24 der deutschen CIUS (XRechnung 3.0, bautakt-web#184). */
export const XRECHNUNG_GUIDELINE_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0";
/** BT-23 Geschäftsprozess; die XRechnung verlangt ihn (PEPPOL-EN16931-R001). */
export const PEPPOL_BILLING_PROCESS_ID = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Betrag in Cent -> "1234.56" (Punkt als Dezimaltrenner, genau 2 Stellen). */
function amount(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  const value = safe / 100;
  const out = value.toFixed(2);
  return out === "-0.00" ? "0.00" : out;
}

/** Prozentsatz -> maximal 2 Nachkommastellen, ohne ueberfluessige Nullen. */
function percent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return String(Math.round(safe * 100) / 100);
}

/** Menge -> maximal 4 Nachkommastellen. */
function quantity(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return String(Math.round(safe * 10000) / 10000);
}

/** ISO-Datum -> CII-Format 102 (YYYYMMDD). */
function date102(isoDate: string): string {
  return isoDate.replace(/-/g, "").slice(0, 8);
}

function addressXml(address: PostalAddress, indent: string): string {
  const parts = [`${indent}<ram:PostalTradeAddress>`];
  if (address.postcode) {
    parts.push(`${indent}  <ram:PostcodeCode>${esc(address.postcode)}</ram:PostcodeCode>`);
  }
  if (address.line1) {
    parts.push(`${indent}  <ram:LineOne>${esc(address.line1)}</ram:LineOne>`);
  }
  if (address.city) {
    parts.push(`${indent}  <ram:CityName>${esc(address.city)}</ram:CityName>`);
  }
  parts.push(`${indent}  <ram:CountryID>${esc(address.countryCode)}</ram:CountryID>`);
  parts.push(`${indent}</ram:PostalTradeAddress>`);
  return parts.join("\n");
}

function lineXml(input: RenderLine): string {
  // BR-27: Der Preis ist nie negativ. Ein Abzug (Nachlass, Abschlag) steht
  // deshalb als negative Menge mit positivem Preis; der Betrag bleibt gleich.
  const line = input.unitPriceCents < 0
    ? {
      ...input,
      unitPriceCents: -input.unitPriceCents,
      quantity: -input.quantity,
      allowanceCents: -input.allowanceCents,
    }
    : input;
  const parts: string[] = [];
  parts.push("      <ram:IncludedSupplyChainTradeLineItem>");
  parts.push("        <ram:AssociatedDocumentLineDocument>");
  parts.push(`          <ram:LineID>${line.lineId}</ram:LineID>`);
  if (line.description) {
    // BT-127 Positionsanmerkung
    parts.push("          <ram:IncludedNote>");
    parts.push(`            <ram:Content>${esc(line.description)}</ram:Content>`);
    parts.push("          </ram:IncludedNote>");
  }
  parts.push("        </ram:AssociatedDocumentLineDocument>");
  parts.push("        <ram:SpecifiedTradeProduct>");
  // BT-153 Artikelname
  parts.push(`          <ram:Name>${esc(line.name)}</ram:Name>`);
  parts.push("        </ram:SpecifiedTradeProduct>");
  parts.push("        <ram:SpecifiedLineTradeAgreement>");
  parts.push("          <ram:NetPriceProductTradePrice>");
  // BT-146 Nettopreis
  parts.push(`            <ram:ChargeAmount>${amount(line.unitPriceCents)}</ram:ChargeAmount>`);
  parts.push("          </ram:NetPriceProductTradePrice>");
  parts.push("        </ram:SpecifiedLineTradeAgreement>");
  parts.push("        <ram:SpecifiedLineTradeDelivery>");
  // BT-129 / BT-130 Menge mit Einheitencode
  parts.push(
    `          <ram:BilledQuantity unitCode="${esc(line.unitCode)}">${quantity(line.quantity)}</ram:BilledQuantity>`,
  );
  parts.push("        </ram:SpecifiedLineTradeDelivery>");
  parts.push("        <ram:SpecifiedLineTradeSettlement>");
  parts.push("          <ram:ApplicableTradeTax>");
  parts.push("            <ram:TypeCode>VAT</ram:TypeCode>");
  // BT-151 Steuerkategorie
  parts.push(`            <ram:CategoryCode>${line.taxCategory}</ram:CategoryCode>`);
  // BT-152 Steuersatz
  parts.push(
    `            <ram:RateApplicablePercent>${percent(line.taxRatePercent)}</ram:RateApplicablePercent>`,
  );
  parts.push("          </ram:ApplicableTradeTax>");
  if (line.allowanceCents !== 0) {
    // BT-136 Nachlass bzw. BT-141 Zuschlag auf Positionsebene
    const isCharge = line.allowanceCents < 0;
    const reason = isCharge
      ? "Zuschlag"
      : line.discountPercent > 0
        ? `Rabatt ${percent(line.discountPercent)} %`
        : "Rabatt";
    parts.push("          <ram:SpecifiedTradeAllowanceCharge>");
    parts.push("            <ram:ChargeIndicator>");
    parts.push(`              <udt:Indicator>${isCharge ? "true" : "false"}</udt:Indicator>`);
    parts.push("            </ram:ChargeIndicator>");
    parts.push(
      `            <ram:ActualAmount>${amount(Math.abs(line.allowanceCents))}</ram:ActualAmount>`,
    );
    parts.push(`            <ram:Reason>${esc(reason)}</ram:Reason>`);
    parts.push("          </ram:SpecifiedTradeAllowanceCharge>");
  }
  parts.push("          <ram:SpecifiedTradeSettlementLineMonetarySummation>");
  // BT-131 Positionsbetrag netto
  parts.push(
    `            <ram:LineTotalAmount>${amount(line.netAmountCents)}</ram:LineTotalAmount>`,
  );
  parts.push("          </ram:SpecifiedTradeSettlementLineMonetarySummation>");
  parts.push("        </ram:SpecifiedLineTradeSettlement>");
  parts.push("      </ram:IncludedSupplyChainTradeLineItem>");
  return parts.join("\n");
}

function taxGroupXml(group: TaxBreakdownGroup): string {
  const parts: string[] = [];
  parts.push("        <ram:ApplicableTradeTax>");
  // BT-117 Steuerbetrag der Gruppe
  parts.push(`          <ram:CalculatedAmount>${amount(group.taxCents)}</ram:CalculatedAmount>`);
  parts.push("          <ram:TypeCode>VAT</ram:TypeCode>");
  if (group.exemptionReason && (group.categoryCode === "E" || group.categoryCode === "AE")) {
    // BT-120 Befreiungsgrund — Pflicht bei E und AE, verboten bei S und Z
    parts.push(`          <ram:ExemptionReason>${esc(group.exemptionReason)}</ram:ExemptionReason>`);
  }
  // BT-116 steuerpflichtiger Betrag
  parts.push(`          <ram:BasisAmount>${amount(group.basisCents)}</ram:BasisAmount>`);
  // BT-118 Kategoriecode
  parts.push(`          <ram:CategoryCode>${group.categoryCode}</ram:CategoryCode>`);
  // BT-119 Steuersatz
  parts.push(
    `          <ram:RateApplicablePercent>${percent(group.ratePercent)}</ram:RateApplicablePercent>`,
  );
  parts.push("        </ram:ApplicableTradeTax>");
  return parts.join("\n");
}

/** UNTDID 1001: Gutschrift. */
const CREDIT_NOTE = "381";

/**
 * Eine Gutschrift (381) nennt den gutgeschriebenen Betrag positiv; der
 * Typcode trägt das Vorzeichen. Storno und Gutschrift liegen in der
 * Datenbank negiert vor (Positionen mit umgekehrtem Vorzeichen), deshalb
 * dreht das XML alle Beträge um. Nebenbei hält das BR-27 ein (Preis nie
 * negativ). Das PDF zeigt weiter die gespeicherten, negativen Beträge.
 */
function asCreditNote(data: InvoiceData): InvoiceData {
  const t = data.totals;
  return {
    ...data,
    lines: data.lines.map((line) => ({
      ...line,
      unitPriceCents: -line.unitPriceCents,
      netAmountCents: -line.netAmountCents,
      allowanceCents: -line.allowanceCents,
    })),
    taxBreakdown: data.taxBreakdown.map((group) => ({
      ...group,
      basisCents: -group.basisCents,
      taxCents: -group.taxCents,
    })),
    totals: {
      lineTotalCents: -t.lineTotalCents,
      allowanceTotalCents: -t.allowanceTotalCents,
      chargeTotalCents: -t.chargeTotalCents,
      taxBasisTotalCents: -t.taxBasisTotalCents,
      taxTotalCents: -t.taxTotalCents,
      grandTotalCents: -t.grandTotalCents,
      prepaidCents: -t.prepaidCents,
      duePayableCents: -t.duePayableCents,
    },
  };
}

/**
 * Baut das EN16931-konforme CII-XML.
 *
 * `einvoiceFormat = "xrechnung"` ergibt dasselbe XML mit der Kennung der
 * deutschen CIUS und dem Geschäftsprozess. Was die CIUS zusätzlich verlangt
 * (Leitweg-ID, Kontakt des Verkäufers, E-Mail des Käufers), muss in den Daten
 * stehen; fehlt es, warnt `mapping.ts`, und das Freigeben sperrt die
 * Datenbank.
 *
 * Nur fuer rechnungsartige Belege aufrufen: Angebot / Auftragsbestaetigung /
 * Lieferschein sind keine E-Rechnungen und duerfen kein Factur-X-XML tragen.
 * Die Entscheidung trifft der Aufrufer ueber `InvoiceData.isInvoiceLike`.
 */
export function buildCiiXml(input: InvoiceData): string {
  const data = input.typeCode === CREDIT_NOTE ? asCreditNote(input) : input;
  const { seller, buyer, totals, payment } = data;
  const currency = data.currency || "EUR";
  const monetaryLines = data.lines.filter((line) => !line.isText && line.lineId != null);

  const notes: string[] = [];
  if (data.introText) notes.push(data.introText);
  for (const hint of data.taxHints) notes.push(hint);
  if (data.notes) notes.push(data.notes);
  if (data.footerText) notes.push(data.footerText);

  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push("<rsm:CrossIndustryInvoice");
  out.push('  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"');
  out.push(
    '  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"',
  );
  out.push('  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"');
  out.push('  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">');

  // --- Kontext -------------------------------------------------------------
  const isXRechnung = data.einvoiceFormat === "xrechnung";
  out.push("  <rsm:ExchangedDocumentContext>");
  if (isXRechnung) {
    // BT-23 Geschäftsprozess; laut Schema vor BT-24.
    out.push("    <ram:BusinessProcessSpecifiedDocumentContextParameter>");
    out.push(`      <ram:ID>${PEPPOL_BILLING_PROCESS_ID}</ram:ID>`);
    out.push("    </ram:BusinessProcessSpecifiedDocumentContextParameter>");
  }
  out.push("    <ram:GuidelineSpecifiedDocumentContextParameter>");
  // BT-24 Spezifikationskennung
  out.push(`      <ram:ID>${isXRechnung ? XRECHNUNG_GUIDELINE_ID : EN16931_GUIDELINE_ID}</ram:ID>`);
  out.push("    </ram:GuidelineSpecifiedDocumentContextParameter>");
  out.push("  </rsm:ExchangedDocumentContext>");

  // --- Kopf ----------------------------------------------------------------
  out.push("  <rsm:ExchangedDocument>");
  // BT-1 Rechnungsnummer
  out.push(`    <ram:ID>${esc(data.documentNumber || DRAFT_NUMBER)}</ram:ID>`);
  // BT-3 Typcode
  out.push(`    <ram:TypeCode>${esc(data.typeCode)}</ram:TypeCode>`);
  // BT-2 Rechnungsdatum
  out.push("    <ram:IssueDateTime>");
  out.push(`      <udt:DateTimeString format="102">${date102(data.issueDate)}</udt:DateTimeString>`);
  out.push("    </ram:IssueDateTime>");
  for (const note of notes) {
    // BT-22 Freitext
    out.push("    <ram:IncludedNote>");
    out.push(`      <ram:Content>${esc(note)}</ram:Content>`);
    out.push("    </ram:IncludedNote>");
  }
  out.push("  </rsm:ExchangedDocument>");

  out.push("  <rsm:SupplyChainTradeTransaction>");

  // --- Positionen (BG-25) ---------------------------------------------------
  for (const line of monetaryLines) {
    out.push(lineXml(line));
  }

  // --- Vereinbarung ---------------------------------------------------------
  out.push("    <ram:ApplicableHeaderTradeAgreement>");
  if (data.buyerReference) {
    // BT-10 Kaeuferreferenz / Leitweg-ID. Muss laut CII-Schema (xsd:sequence)
    // vor SellerTradeParty stehen — nicht verschieben. Fehlt sie, ist keine
    // XRechnung an oeffentliche Auftraggeber moeglich (BR-DE-15); leer lassen
    // ist aber im Profil EN 16931 zulaessig, deshalb kein Pflichtelement.
    out.push(`      <ram:BuyerReference>${esc(data.buyerReference)}</ram:BuyerReference>`);
  }
  out.push("      <ram:SellerTradeParty>");
  if (!seller.vatId && !seller.tradeRegister && seller.taxNumber) {
    // BT-29 Verkaeuferkennung. BR-CO-26 verlangt BT-29, BT-30 oder BT-31;
    // die Steuernummer (BT-32) zaehlt dafuer nicht. Ein Kleinunternehmer ohne
    // USt-IdNr. und ohne Registereintrag hat nur sie, deshalb steht sie hier
    // zusaetzlich als Kennung (KoSIT-Pruefung, bautakt-web#140).
    out.push(`        <ram:ID>${esc(seller.taxNumber)}</ram:ID>`);
  }
  // BT-27 Verkaeufername
  out.push(`        <ram:Name>${esc(seller.name)}</ram:Name>`);
  if (seller.tradeRegister) {
    // BT-30 Registereintrag
    out.push("        <ram:SpecifiedLegalOrganization>");
    out.push(`          <ram:ID>${esc(seller.tradeRegister)}</ram:ID>`);
    out.push("        </ram:SpecifiedLegalOrganization>");
  }
  if (seller.phone || seller.email) {
    // BG-6 Kontakt des Verkäufers (BT-41 bis BT-43), in der XRechnung Pflicht
    // (BR-DE-2). Eine eigene Kontaktperson kennt der Betrieb nicht; die
    // Kontaktstelle ist der Betrieb selbst.
    out.push("        <ram:DefinedTradeContact>");
    out.push(`          <ram:PersonName>${esc(seller.name)}</ram:PersonName>`);
    if (seller.phone) {
      out.push("          <ram:TelephoneUniversalCommunication>");
      out.push(`            <ram:CompleteNumber>${esc(seller.phone)}</ram:CompleteNumber>`);
      out.push("          </ram:TelephoneUniversalCommunication>");
    }
    if (seller.email) {
      out.push("          <ram:EmailURIUniversalCommunication>");
      out.push(`            <ram:URIID>${esc(seller.email)}</ram:URIID>`);
      out.push("          </ram:EmailURIUniversalCommunication>");
    }
    out.push("        </ram:DefinedTradeContact>");
  }
  out.push(addressXml(seller.address, "        "));
  if (seller.email) {
    // BT-34 elektronische Adresse des Verkaeufers
    out.push("        <ram:URIUniversalCommunication>");
    out.push(`          <ram:URIID schemeID="EM">${esc(seller.email)}</ram:URIID>`);
    out.push("        </ram:URIUniversalCommunication>");
  }
  if (seller.vatId) {
    // BT-31 USt-IdNr.
    out.push("        <ram:SpecifiedTaxRegistration>");
    out.push(`          <ram:ID schemeID="VA">${esc(seller.vatId)}</ram:ID>`);
    out.push("        </ram:SpecifiedTaxRegistration>");
  }
  if (seller.taxNumber) {
    // BT-32 Steuernummer
    out.push("        <ram:SpecifiedTaxRegistration>");
    out.push(`          <ram:ID schemeID="FC">${esc(seller.taxNumber)}</ram:ID>`);
    out.push("        </ram:SpecifiedTaxRegistration>");
  }
  out.push("      </ram:SellerTradeParty>");

  out.push("      <ram:BuyerTradeParty>");
  if (buyer.customerNumber) {
    // BT-46 Kaeuferkennung
    out.push(`        <ram:ID>${esc(buyer.customerNumber)}</ram:ID>`);
  }
  // BT-44 Kaeufername
  out.push(`        <ram:Name>${esc(buyer.name || "—")}</ram:Name>`);
  out.push(addressXml(buyer.address, "        "));
  if (buyer.email) {
    // BT-49 elektronische Adresse des Kaeufers
    out.push("        <ram:URIUniversalCommunication>");
    out.push(`          <ram:URIID schemeID="EM">${esc(buyer.email)}</ram:URIID>`);
    out.push("        </ram:URIUniversalCommunication>");
  }
  if (buyer.vatId) {
    // BT-48 USt-IdNr. des Kaeufers
    out.push("        <ram:SpecifiedTaxRegistration>");
    out.push(`          <ram:ID schemeID="VA">${esc(buyer.vatId)}</ram:ID>`);
    out.push("        </ram:SpecifiedTaxRegistration>");
  }
  out.push("      </ram:BuyerTradeParty>");
  out.push("    </ram:ApplicableHeaderTradeAgreement>");

  // --- Lieferung ------------------------------------------------------------
  out.push("    <ram:ApplicableHeaderTradeDelivery>");
  if (data.serviceDate) {
    // BT-72 Leistungsdatum
    out.push("      <ram:ActualDeliverySupplyChainEvent>");
    out.push("        <ram:OccurrenceDateTime>");
    out.push(
      `          <udt:DateTimeString format="102">${date102(data.serviceDate)}</udt:DateTimeString>`,
    );
    out.push("        </ram:OccurrenceDateTime>");
    out.push("      </ram:ActualDeliverySupplyChainEvent>");
  }
  out.push("    </ram:ApplicableHeaderTradeDelivery>");

  // --- Abrechnung -----------------------------------------------------------
  out.push("    <ram:ApplicableHeaderTradeSettlement>");
  // BT-5 Waehrung
  out.push(`      <ram:InvoiceCurrencyCode>${esc(currency)}</ram:InvoiceCurrencyCode>`);
  if (seller.iban) {
    // BG-16 Zahlungsanweisungen
    out.push("      <ram:SpecifiedTradeSettlementPaymentMeans>");
    // BT-81 Code fuer die Zahlungsart (58 = SEPA-Ueberweisung)
    out.push("        <ram:TypeCode>58</ram:TypeCode>");
    out.push("        <ram:PayeePartyCreditorFinancialAccount>");
    // BT-84 IBAN
    out.push(`          <ram:IBANID>${esc(seller.iban)}</ram:IBANID>`);
    // BT-85 Kontoinhaber
    out.push(`          <ram:AccountName>${esc(seller.name)}</ram:AccountName>`);
    out.push("        </ram:PayeePartyCreditorFinancialAccount>");
    if (seller.bic) {
      // BT-86 BIC
      out.push("        <ram:PayeeSpecifiedCreditorFinancialInstitution>");
      out.push(`          <ram:BICID>${esc(seller.bic)}</ram:BICID>`);
      out.push("        </ram:PayeeSpecifiedCreditorFinancialInstitution>");
    }
    out.push("      </ram:SpecifiedTradeSettlementPaymentMeans>");
  } else {
    out.push("      <ram:SpecifiedTradeSettlementPaymentMeans>");
    // 1 = Instrument nicht definiert
    out.push("        <ram:TypeCode>1</ram:TypeCode>");
    out.push("      </ram:SpecifiedTradeSettlementPaymentMeans>");
  }

  // BG-23 USt-Aufschluesselung je Steuersatzgruppe
  for (const group of data.taxBreakdown) {
    out.push(taxGroupXml(group));
  }

  // BG-14 Rechnungszeitraum entfaellt — die App kennt nur ein Leistungsdatum.

  out.push("      <ram:SpecifiedTradePaymentTerms>");
  // BT-20 Zahlungsbedingungen; Skonto zusätzlich maschinenlesbar nach
  // XRechnung-Konvention (BR-DE-18), jede Angabe mit Zeilenumbruch abgeschlossen.
  const skontoLine =
    payment.skontoPercent != null && payment.skontoDays != null
      ? `#SKONTO#TAGE=${payment.skontoDays}#PROZENT=${payment.skontoPercent.toFixed(2)}#&#10;`
      : "";
  out.push(
    `        <ram:Description>${skontoLine}${esc(payment.termsText)}</ram:Description>`,
  );
  if (payment.dueDate) {
    // BT-9 Faelligkeitsdatum
    out.push("        <ram:DueDateDateTime>");
    out.push(
      `          <udt:DateTimeString format="102">${date102(payment.dueDate)}</udt:DateTimeString>`,
    );
    out.push("        </ram:DueDateDateTime>");
  }
  out.push("      </ram:SpecifiedTradePaymentTerms>");

  // BG-22 Summen
  out.push("      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>");
  // BT-106 Summe der Nettobetraege der Positionen
  out.push(`        <ram:LineTotalAmount>${amount(totals.lineTotalCents)}</ram:LineTotalAmount>`);
  // BT-108 Summe Zuschlaege
  out.push(
    `        <ram:ChargeTotalAmount>${amount(totals.chargeTotalCents)}</ram:ChargeTotalAmount>`,
  );
  // BT-107 Summe Nachlaesse
  out.push(
    `        <ram:AllowanceTotalAmount>${amount(totals.allowanceTotalCents)}</ram:AllowanceTotalAmount>`,
  );
  // BT-109 Gesamtbetrag ohne USt
  out.push(
    `        <ram:TaxBasisTotalAmount>${amount(totals.taxBasisTotalCents)}</ram:TaxBasisTotalAmount>`,
  );
  // BT-110 USt-Gesamtbetrag
  out.push(
    `        <ram:TaxTotalAmount currencyID="${esc(currency)}">${amount(totals.taxTotalCents)}</ram:TaxTotalAmount>`,
  );
  // BT-112 Gesamtbetrag mit USt
  out.push(`        <ram:GrandTotalAmount>${amount(totals.grandTotalCents)}</ram:GrandTotalAmount>`);
  // BT-113 Vorauszahlung
  out.push(
    `        <ram:TotalPrepaidAmount>${amount(totals.prepaidCents)}</ram:TotalPrepaidAmount>`,
  );
  // BT-115 Faelliger Zahlbetrag
  out.push(`        <ram:DuePayableAmount>${amount(totals.duePayableCents)}</ram:DuePayableAmount>`);
  out.push("      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>");
  for (const ref of data.precedingInvoices) {
    // BG-3 Rechnungsbezug: BT-25 Nummer, BT-26 Datum. Steht laut Schema nach
    // den Summen; bei der Schlussrechnung einmal je Abschlag.
    out.push("      <ram:InvoiceReferencedDocument>");
    out.push(`        <ram:IssuerAssignedID>${esc(ref.number)}</ram:IssuerAssignedID>`);
    if (ref.issueDate) {
      out.push("        <ram:FormattedIssueDateTime>");
      out.push(
        `          <qdt:DateTimeString format="102">${date102(ref.issueDate)}</qdt:DateTimeString>`,
      );
      out.push("        </ram:FormattedIssueDateTime>");
    }
    out.push("      </ram:InvoiceReferencedDocument>");
  }
  out.push("    </ram:ApplicableHeaderTradeSettlement>");
  out.push("  </rsm:SupplyChainTradeTransaction>");
  out.push("</rsm:CrossIndustryInvoice>");
  out.push("");

  return out.join("\n");
}
