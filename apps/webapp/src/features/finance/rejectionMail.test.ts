import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fillTemplate,
  isSameTemplate,
  originalKind,
  rejectionReason,
  type RejectionValues,
  sellerEmailFromParse,
  suggestedRecipient,
  templateErrors,
  unknownPlaceholders,
} from './rejectionMail.ts';

const values: RejectionValues = {
  rechnungsnummer: 'R-2026-17',
  rechnungsdatum: '12.10.2026',
  betrag: '1.190,00 €',
  lieferant: 'Muster Baustoffe GmbH',
  grund: 'Menge passt nicht\nzum Lieferschein',
  firma: 'Bautakt Testbetrieb GmbH',
};

describe('fillTemplate', () => {
  it('ersetzt alle bekannten Platzhalter, auch mehrfach und in Großschreibung', () => {
    const filled = fillTemplate(
      {
        subject: 'Rechnung {rechnungsnummer} vom {Rechnungsdatum}',
        body: '{lieferant}: {betrag}\n{grund}\n{firma} {rechnungsnummer}',
      },
      values,
    );
    assert.equal(filled.subject, 'Rechnung R-2026-17 vom 12.10.2026');
    assert.equal(
      filled.body,
      'Muster Baustoffe GmbH: 1.190,00 €\nMenge passt nicht\nzum Lieferschein\nBautakt Testbetrieb GmbH R-2026-17',
    );
  });

  it('Betreff bleibt einzeilig, auch wenn der Grund Umbrüche hat', () => {
    assert.equal(
      fillTemplate({ subject: 'Ablehnung: {grund}', body: 'x' }, values).subject,
      'Ablehnung: Menge passt nicht zum Lieferschein',
    );
  });

  it('lässt unbekannte Platzhalter stehen', () => {
    assert.equal(
      fillTemplate({ subject: '{rechnungsnr}', body: '{}' }, values).subject,
      '{rechnungsnr}',
    );
  });

  it('Werte mit $ werden nicht als Ersetzungsmuster gelesen', () => {
    const filled = fillTemplate(
      { subject: '{lieferant}', body: 'x' },
      { ...values, lieferant: "A $& B $'" },
    );
    assert.equal(filled.subject, "A $& B $'");
  });
});

describe('unknownPlaceholders', () => {
  it('meldet Tippfehler je einmal', () => {
    assert.deepEqual(
      unknownPlaceholders({ subject: '{rechnungsnr}', body: '{rechnungsnr} {grund} {datum}' }),
      ['{rechnungsnr}', '{datum}'],
    );
  });

  it('nichts bei korrekter Vorlage', () => {
    assert.deepEqual(unknownPlaceholders({ subject: '{rechnungsnummer}', body: '{firma}' }), []);
  });
});

describe('templateErrors', () => {
  it('wie die CHECKs der Tabelle', () => {
    assert.deepEqual(templateErrors({ subject: ' ', body: '' }), {
      subject: 'subjectRequired',
      body: 'bodyRequired',
    });
    assert.equal(templateErrors({ subject: 'a\nb', body: 'x' }).subject, 'subjectLineBreak');
    assert.equal(templateErrors({ subject: 'a'.repeat(999), body: 'x' }).subject, 'subjectTooLong');
    assert.equal(templateErrors({ subject: 'a', body: 'x'.repeat(20001) }).body, 'bodyTooLong');
    assert.deepEqual(templateErrors({ subject: 'a'.repeat(998), body: 'x'.repeat(20000) }), {
      subject: null,
      body: null,
    });
  });
});

describe('isSameTemplate', () => {
  it('ignoriert Leerraum am Rand', () => {
    assert.equal(isSameTemplate({ subject: ' a', body: 'b\n' }, { subject: 'a', body: 'b' }), true);
    assert.equal(isSameTemplate({ subject: 'a', body: 'b' }, { subject: 'a', body: 'c' }), false);
  });
});

describe('Empfänger', () => {
  it('BT-43 aus der Antwort von finance-inbound-parse', () => {
    assert.equal(
      sellerEmailFromParse({ seller: { email: ' Rechnung@Muster.de ' } }),
      'rechnung@muster.de',
    );
    assert.equal(sellerEmailFromParse({ seller: { email: '' } }), null);
    assert.equal(sellerEmailFromParse({ seller: { email: 'keine-adresse' } }), null);
    assert.equal(sellerEmailFromParse({ seller: { email: 'a@b.de, c@d.de' } }), null);
    assert.equal(sellerEmailFromParse({ extracted: false }), null);
    assert.equal(sellerEmailFromParse(null), null);
  });

  it('erst E-Rechnung, dann Kontakt, sonst leer', () => {
    assert.deepEqual(suggestedRecipient('a@b.de', 'c@d.de'), {
      address: 'a@b.de',
      source: 'eInvoice',
    });
    assert.deepEqual(suggestedRecipient(null, 'C@d.de'), { address: 'c@d.de', source: 'contact' });
    assert.deepEqual(suggestedRecipient(null, 'kaputt'), { address: '', source: null });
    assert.deepEqual(suggestedRecipient(null, null), { address: '', source: null });
  });
});

describe('rejectionReason', () => {
  it('jüngste Ablehnung', () => {
    assert.equal(
      rejectionReason([
        { action: 'rejected', reason: 'alt', created_at: '2026-10-01T10:00:00Z' },
        { action: 'mail_sent', reason: '', created_at: '2026-10-03T10:00:00Z' },
        { action: 'rejected', reason: ' neu ', created_at: '2026-10-02T10:00:00Z' },
      ]),
      'neu',
    );
    assert.equal(rejectionReason([]), '');
  });
});

describe('originalKind', () => {
  it('nur PDF und XML', () => {
    assert.equal(originalKind('a/b/rechnung.PDF'), 'pdf');
    assert.equal(originalKind('a/b/rechnung.xml'), 'xml');
    assert.equal(originalKind('a/b/foto.jpg'), null);
  });
});
