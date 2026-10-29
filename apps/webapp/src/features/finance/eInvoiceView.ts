/**
 * E-Rechnung lesbar machen (bautakt-web#88, Teil 3): Aus dem XML einer
 * XRechnung oder ZUGFeRD-Datei (CII oder UBL) wird, was ein Mensch auf einer
 * Rechnung sucht: Absender, Empfänger, Nummer, Daten, Positionen, Summen,
 * Bankverbindung.
 *
 * Reine Anzeige. Gebucht wird weiter, was im Formular steht; die Beträge
 * bleiben deshalb so, wie sie im Dokument stehen, als Text.
 *
 * Ohne DOM: Der Browser übersetzt sein `Document` mit `xmlTree` in `XmlNode`,
 * die Tests bauen den Baum selbst. So läuft das hier mit `node --test`.
 */

export type XmlNode = {
  /** Name ohne Präfix (`ram:ID` → `ID`). */
  name: string;
  attrs: Record<string, string>;
  text: string;
  children: XmlNode[];
};

export type EInvoiceParty = {
  name: string;
  vatId: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

export type EInvoiceLine = {
  id: string;
  name: string;
  quantity: string;
  unitCode: string;
  netPrice: string;
  vatPercent: string;
  lineTotal: string;
};

export type EInvoiceView = {
  syntax: 'cii' | 'ubl';
  /** `Invoice` oder `CreditNote` (UBL), Typcode (CII, 381 = Gutschrift). */
  isCreditNote: boolean;
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  /** BT-10, bei öffentlichen Auftraggebern die Leitweg-ID. */
  buyerReference: string;
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  lines: EInvoiceLine[];
  totals: { net: string; vat: string; gross: string; payable: string };
  ibans: string[];
  paymentTerms: string;
  notes: string[];
};

/** Kind über einen Pfad aus Namen; nimmt jeweils das erste passende. */
function at(node: XmlNode | undefined, ...path: string[]): XmlNode | undefined {
  let current = node;
  for (const name of path) {
    current = current?.children.find((child) => child.name === name);
    if (!current) return undefined;
  }
  return current;
}

function all(node: XmlNode | undefined, name: string): XmlNode[] {
  return node ? node.children.filter((child) => child.name === name) : [];
}

function text(node: XmlNode | undefined, ...path: string[]): string {
  return at(node, ...path)?.text.trim() ?? '';
}

/** CII-Datum (Format 102, `20261001`) als ISO; anderes bleibt, wie es ist. */
function ciiDate(node: XmlNode | undefined): string {
  const raw = text(node, 'DateTimeString');
  return /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
}

/** Betrag in Belegwährung: CII führt `TaxTotalAmount` je Währung einmal. */
function amountIn(nodes: XmlNode[], currency: string): string {
  const match = nodes.find((node) => !node.attrs.currencyID || node.attrs.currencyID === currency);
  return (match ?? nodes[0])?.text.trim() ?? '';
}

function nonEmpty(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function ciiParty(party: XmlNode | undefined): EInvoiceParty {
  const address = at(party, 'PostalTradeAddress');
  const vat = all(party, 'SpecifiedTaxRegistration').find(
    (registration) => at(registration, 'ID')?.attrs.schemeID === 'VA',
  );
  return {
    name: text(party, 'Name'),
    vatId: text(vat, 'ID'),
    street: text(address, 'LineOne'),
    postalCode: text(address, 'PostcodeCode'),
    city: text(address, 'CityName'),
    country: text(address, 'CountryID'),
  };
}

function readCii(root: XmlNode): EInvoiceView {
  const document = at(root, 'ExchangedDocument');
  const transaction = at(root, 'SupplyChainTradeTransaction');
  const agreement = at(transaction, 'ApplicableHeaderTradeAgreement');
  const settlement = at(transaction, 'ApplicableHeaderTradeSettlement');
  const summation = at(settlement, 'SpecifiedTradeSettlementHeaderMonetarySummation');
  const terms = all(settlement, 'SpecifiedTradePaymentTerms');
  const currency = text(settlement, 'InvoiceCurrencyCode');

  return {
    syntax: 'cii',
    isCreditNote: text(document, 'TypeCode') === '381',
    number: text(document, 'ID'),
    issueDate: ciiDate(at(document, 'IssueDateTime')),
    dueDate: ciiDate(
      at(
        terms.find((term) => at(term, 'DueDateDateTime')),
        'DueDateDateTime',
      ),
    ),
    currency,
    buyerReference: text(agreement, 'BuyerReference'),
    seller: ciiParty(at(agreement, 'SellerTradeParty')),
    buyer: ciiParty(at(agreement, 'BuyerTradeParty')),
    lines: all(transaction, 'IncludedSupplyChainTradeLineItem').map((item) => {
      const quantity = at(item, 'SpecifiedLineTradeDelivery', 'BilledQuantity');
      const lineSettlement = at(item, 'SpecifiedLineTradeSettlement');
      return {
        id: text(item, 'AssociatedDocumentLineDocument', 'LineID'),
        name: text(item, 'SpecifiedTradeProduct', 'Name'),
        quantity: quantity?.text.trim() ?? '',
        unitCode: quantity?.attrs.unitCode ?? '',
        netPrice: text(
          item,
          'SpecifiedLineTradeAgreement',
          'NetPriceProductTradePrice',
          'ChargeAmount',
        ),
        vatPercent: text(lineSettlement, 'ApplicableTradeTax', 'RateApplicablePercent'),
        lineTotal: text(
          lineSettlement,
          'SpecifiedTradeSettlementLineMonetarySummation',
          'LineTotalAmount',
        ),
      };
    }),
    totals: {
      net: text(summation, 'TaxBasisTotalAmount'),
      vat: amountIn(all(summation, 'TaxTotalAmount'), currency),
      gross: text(summation, 'GrandTotalAmount'),
      payable: text(summation, 'DuePayableAmount'),
    },
    ibans: nonEmpty(
      all(settlement, 'SpecifiedTradeSettlementPaymentMeans').map((means) =>
        text(means, 'PayeePartyCreditorFinancialAccount', 'IBANID'),
      ),
    ),
    paymentTerms: nonEmpty(terms.map((term) => text(term, 'Description'))).join('\n'),
    notes: nonEmpty(all(document, 'IncludedNote').map((note) => text(note, 'Content'))),
  };
}

function ublParty(wrapper: XmlNode | undefined): EInvoiceParty {
  const party = at(wrapper, 'Party');
  const address = at(party, 'PostalAddress');
  return {
    name: text(party, 'PartyLegalEntity', 'RegistrationName') || text(party, 'PartyName', 'Name'),
    vatId: text(party, 'PartyTaxScheme', 'CompanyID'),
    street: text(address, 'StreetName'),
    postalCode: text(address, 'PostalZone'),
    city: text(address, 'CityName'),
    country: text(address, 'Country', 'IdentificationCode'),
  };
}

function readUbl(root: XmlNode): EInvoiceView {
  const isCreditNote = root.name === 'CreditNote';
  const currency = text(root, 'DocumentCurrencyCode');
  const totals = at(root, 'LegalMonetaryTotal');
  const taxTotals = all(root, 'TaxTotal').flatMap((total) => all(total, 'TaxAmount'));

  return {
    syntax: 'ubl',
    isCreditNote,
    number: text(root, 'ID'),
    issueDate: text(root, 'IssueDate'),
    dueDate: text(root, 'DueDate') || text(at(root, 'PaymentMeans'), 'PaymentDueDate'),
    currency,
    buyerReference: text(root, 'BuyerReference'),
    seller: ublParty(at(root, 'AccountingSupplierParty')),
    buyer: ublParty(at(root, 'AccountingCustomerParty')),
    lines: all(root, isCreditNote ? 'CreditNoteLine' : 'InvoiceLine').map((line) => {
      const quantity = at(line, isCreditNote ? 'CreditedQuantity' : 'InvoicedQuantity');
      return {
        id: text(line, 'ID'),
        name: text(line, 'Item', 'Name'),
        quantity: quantity?.text.trim() ?? '',
        unitCode: quantity?.attrs.unitCode ?? '',
        netPrice: text(line, 'Price', 'PriceAmount'),
        vatPercent: text(line, 'Item', 'ClassifiedTaxCategory', 'Percent'),
        lineTotal: text(line, 'LineExtensionAmount'),
      };
    }),
    totals: {
      net: text(totals, 'TaxExclusiveAmount'),
      vat: amountIn(taxTotals, currency),
      gross: text(totals, 'TaxInclusiveAmount'),
      payable: text(totals, 'PayableAmount'),
    },
    ibans: nonEmpty(
      all(root, 'PaymentMeans').map((means) => text(means, 'PayeeFinancialAccount', 'ID')),
    ),
    paymentTerms: nonEmpty(all(root, 'PaymentTerms').map((terms) => text(terms, 'Note'))).join(
      '\n',
    ),
    notes: nonEmpty(all(root, 'Note').map((note) => note.text)),
  };
}

/**
 * Wurzel einer E-Rechnung lesen. `null`, wenn es weder CII noch UBL ist; der
 * Aufrufer zeigt dann den Rohtext.
 */
export function readEInvoice(root: XmlNode): EInvoiceView | null {
  if (root.name === 'CrossIndustryInvoice') return readCii(root);
  if (root.name === 'Invoice' || root.name === 'CreditNote') return readUbl(root);
  return null;
}

/** Häufige Einheiten (UN/ECE Rec 20) auf Deutsch; Unbekanntes bleibt als Code. */
const UNITS: Record<string, string> = {
  C62: 'Stk.',
  H87: 'Stk.',
  XPP: 'Stk.',
  SET: 'Satz',
  LS: 'pauschal',
  HUR: 'Std.',
  MIN: 'Min.',
  DAY: 'Tag(e)',
  MTR: 'm',
  MTK: 'm²',
  MTQ: 'm³',
  KMT: 'km',
  KGM: 'kg',
  TNE: 't',
  LTR: 'l',
};

export function unitLabel(code: string): string {
  return UNITS[code] ?? code;
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  xml: 'application/xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Download-Name: Lieferant und Rechnungsnummer statt der Beleg-ID. */
export function originalDownload(
  storagePath: string,
  invoice: { vendor_name: string; invoice_number: string },
): { fileName: string; mimeType: string } {
  const ext = storagePath.toLowerCase().split('.').pop() ?? '';
  const base =
    [invoice.vendor_name, invoice.invoice_number]
      .map((part) =>
        part
          .trim()
          .replace(/[^\p{L}\p{N}]+/gu, '-')
          .replace(/^-+|-+$/g, ''),
      )
      .filter(Boolean)
      .join('_') || 'Eingangsrechnung';
  return { fileName: `${base}.${ext}`, mimeType: MIME[ext] ?? 'application/octet-stream' };
}
