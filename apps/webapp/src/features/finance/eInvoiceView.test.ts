import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { originalDownload, readEInvoice, unitLabel, type XmlNode } from './eInvoiceView.ts';

/**
 * Kleiner XML-Leser nur für die Tests (im Browser macht das `DOMParser`):
 * Elemente, Attribute, Text, `<?…?>` und Kommentare. Präfixe fallen weg wie
 * bei `localName`.
 */
function xml(source: string): XmlNode {
  const stack: XmlNode[] = [{ name: '#root', attrs: {}, text: '', children: [] }];
  const tokens = source.replace(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->/g, '').split(/(<[^>]+>)/);
  for (const token of tokens) {
    if (!token.startsWith('<')) {
      stack[stack.length - 1]!.text += token;
      continue;
    }
    if (token.startsWith('</')) {
      stack.pop();
      continue;
    }
    const [, rawName = '', rest = ''] = /^<([^\s/>]+)([\s\S]*?)\/?>$/.exec(token) ?? [];
    const attrs: Record<string, string> = {};
    for (const [, key = '', value = ''] of rest.matchAll(/([\w:]+)="([^"]*)"/g)) {
      attrs[key.split(':').pop()!] = value;
    }
    const node: XmlNode = { name: rawName.split(':').pop()!, attrs, text: '', children: [] };
    stack[stack.length - 1]!.children.push(node);
    if (!token.endsWith('/>')) stack.push(node);
  }
  return stack[0]!.children[0]!;
}

// Erfundene Beispieldaten, keine echten Betriebe.
const CII = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocument>
    <ram:ID>R-2026-17</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">20261001</udt:DateTimeString></ram:IssueDateTime>
    <ram:IncludedNote><ram:Content>Lieferung frei Baustelle</ram:Content></ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>Zement 25 kg</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>10.00</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">10</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>100.00</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>04011000-12345-67</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>Baustoffhandel Muster GmbH</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>12345</ram:PostcodeCode><ram:LineOne>Musterweg 1</ram:LineOne>
          <ram:CityName>Musterstadt</ram:CityName><ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">12/345/67890</ram:ID></ram:SpecifiedTaxRegistration>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">DE000000000</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>Testbetrieb GmbH</ram:Name></ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:PayeePartyCreditorFinancialAccount><ram:IBANID>DE00 0000 0000 0000 0000 00</ram:IBANID></ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Zahlbar innerhalb 30 Tagen</ram:Description>
        <ram:DueDateDateTime><udt:DateTimeString format="102">20261031</udt:DateTimeString></ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>100.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>100.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="CHF">17.80</ram:TaxTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">19.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>119.00</ram:GrandTotalAmount>
        <ram:DuePayableAmount>119.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

const UBL = `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>GS-5</cbc:ID>
  <cbc:IssueDate>2026-10-02</cbc:IssueDate>
  <cbc:Note>Rückgabe Paletten</cbc:Note>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>Bestellung 42</cbc:BuyerReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyName><cbc:Name>Muster Handelsname</cbc:Name></cac:PartyName>
    <cac:PostalAddress>
      <cbc:StreetName>Musterweg 1</cbc:StreetName><cbc:CityName>Musterstadt</cbc:CityName>
      <cbc:PostalZone>12345</cbc:PostalZone><cac:Country><cbc:IdentificationCode>DE</cbc:IdentificationCode></cac:Country>
    </cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>DE000000000</cbc:CompanyID></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>Muster GmbH</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyName><cbc:Name>Testbetrieb GmbH</cbc:Name></cac:PartyName>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount><cbc:ID>DE00000000000000000000</cbc:ID></cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:TaxTotal><cbc:TaxAmount currencyID="EUR">3.80</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">20.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">20.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">23.80</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">23.80</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:CreditNoteLine>
    <cbc:ID>1</cbc:ID>
    <cbc:CreditedQuantity unitCode="XPP">2</cbc:CreditedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">20.00</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>Europalette</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>19</cbc:Percent></cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">10.00</cbc:PriceAmount></cac:Price>
  </cac:CreditNoteLine>
</CreditNote>`;

describe('readEInvoice', () => {
  it('CII (ZUGFeRD, XRechnung CII): Kopf, Parteien, Positionen, Summen', () => {
    const view = readEInvoice(xml(CII));
    assert.ok(view);
    assert.equal(view.syntax, 'cii');
    assert.equal(view.isCreditNote, false);
    assert.equal(view.number, 'R-2026-17');
    assert.equal(view.issueDate, '2026-10-01');
    assert.equal(view.dueDate, '2026-10-31');
    assert.equal(view.buyerReference, '04011000-12345-67');
    assert.deepEqual(view.seller, {
      name: 'Baustoffhandel Muster GmbH',
      vatId: 'DE000000000',
      street: 'Musterweg 1',
      postalCode: '12345',
      city: 'Musterstadt',
      country: 'DE',
    });
    assert.equal(view.buyer.name, 'Testbetrieb GmbH');
    assert.deepEqual(view.lines, [
      {
        id: '1',
        name: 'Zement 25 kg',
        quantity: '10',
        unitCode: 'C62',
        netPrice: '10.00',
        vatPercent: '19',
        lineTotal: '100.00',
      },
    ]);
    // Die USt in Belegwährung, nicht die erste Angabe.
    assert.deepEqual(view.totals, {
      net: '100.00',
      vat: '19.00',
      gross: '119.00',
      payable: '119.00',
    });
    assert.deepEqual(view.ibans, ['DE00 0000 0000 0000 0000 00']);
    assert.equal(view.paymentTerms, 'Zahlbar innerhalb 30 Tagen');
    assert.deepEqual(view.notes, ['Lieferung frei Baustelle']);
  });

  it('UBL-Gutschrift: Positionen aus CreditNoteLine, Name aus dem Rechtsträger', () => {
    const view = readEInvoice(xml(UBL));
    assert.ok(view);
    assert.equal(view.syntax, 'ubl');
    assert.equal(view.isCreditNote, true);
    assert.equal(view.number, 'GS-5');
    assert.equal(view.dueDate, '');
    assert.equal(view.seller.name, 'Muster GmbH');
    assert.equal(view.seller.postalCode, '12345');
    assert.equal(view.lines[0]?.unitCode, 'XPP');
    assert.equal(view.lines[0]?.netPrice, '10.00');
    assert.deepEqual(view.totals, { net: '20.00', vat: '3.80', gross: '23.80', payable: '23.80' });
    assert.deepEqual(view.ibans, ['DE00000000000000000000']);
    assert.deepEqual(view.notes, ['Rückgabe Paletten']);
  });

  it('anderes XML ist keine E-Rechnung', () => {
    assert.equal(readEInvoice(xml('<Bestellung><ID>1</ID></Bestellung>')), null);
  });
});

describe('Original', () => {
  it('Download heißt nach Lieferant und Nummer', () => {
    assert.deepEqual(
      originalDownload('c/incoming/1.xml', {
        vendor_name: 'Müller & Söhne GmbH',
        invoice_number: 'R/2026/17',
      }),
      { fileName: 'Müller-Söhne-GmbH_R-2026-17.xml', mimeType: 'application/xml' },
    );
    assert.equal(
      originalDownload('c/incoming/1.png', { vendor_name: ' ', invoice_number: '' }).fileName,
      'Eingangsrechnung.png',
    );
  });

  it('Einheiten auf Deutsch, Unbekanntes als Code', () => {
    assert.equal(unitLabel('HUR'), 'Std.');
    assert.equal(unitLabel('ZZZ'), 'ZZZ');
  });
});
