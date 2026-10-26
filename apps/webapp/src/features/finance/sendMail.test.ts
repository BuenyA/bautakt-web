/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attachmentFileName, footerSegments, parseRecipients } from './sendMail.ts';

const labels = { office: 'Sitz', directors: 'Geschäftsführer' };
const gmbh = {
  name: 'Bautakt Testbetrieb GmbH',
  street_address: 'Musterstraße 1',
  postal_code: '70173',
  city: 'Stuttgart',
  register_court: 'Amtsgericht Stuttgart',
  trade_register: 'HRB 12345',
  managing_directors: ['Max Muster', ' Erika Beispiel '],
  registered_office: null,
};

describe('parseRecipients', () => {
  it('trennt an Komma, Semikolon und Leerzeichen und entfernt Dubletten', () => {
    assert.deepEqual(parseRecipients('a@b.de, A@b.de; c@d.de  e@f.de'), {
      valid: ['a@b.de', 'c@d.de', 'e@f.de'],
      invalid: [],
    });
  });

  it('meldet ungültige Adressen getrennt', () => {
    assert.deepEqual(parseRecipients('a@b.de, kaputt'), { valid: ['a@b.de'], invalid: ['kaputt'] });
  });
});

describe('attachmentFileName', () => {
  it('XRechnung bekommt das XML, ZUGFeRD und ohne E-Rechnung das PDF', () => {
    assert.equal(
      attachmentFileName('RE1_X', { e_invoice: true, einvoice_format: 'xrechnung' }),
      'RE1_X.xml',
    );
    assert.equal(
      attachmentFileName('RE1_X', { e_invoice: true, einvoice_format: 'zugferd' }),
      'RE1_X.pdf',
    );
    assert.equal(
      attachmentFileName('RE1_X', { e_invoice: false, einvoice_format: 'xrechnung' }),
      'RE1_X.pdf',
    );
  });
});

describe('footerSegments', () => {
  it('vollständige GmbH: Anschrift, Sitz aus dem Ort, Register, Geschäftsführer', () => {
    assert.deepEqual(footerSegments(gmbh, [], labels), [
      [
        { kind: 'text', value: 'Bautakt Testbetrieb GmbH' },
        { kind: 'text', value: 'Musterstraße 1, 70173 Stuttgart' },
      ],
      [
        { kind: 'text', value: 'Sitz: Stuttgart' },
        { kind: 'text', value: 'Amtsgericht Stuttgart, HRB 12345' },
        { kind: 'text', value: 'Geschäftsführer: Max Muster, Erika Beispiel' },
      ],
    ]);
  });

  it('abweichender Sitz geht vor dem Ort', () => {
    const lines = footerSegments({ ...gmbh, registered_office: 'Esslingen' }, [], labels);
    assert.deepEqual(lines[1][0], { kind: 'text', value: 'Sitz: Esslingen' });
  });

  it('markiert fehlende Pflichtangaben', () => {
    const lines = footerSegments(
      { ...gmbh, register_court: null, trade_register: null, managing_directors: [] },
      ['register_court', 'trade_register', 'managing_directors'],
      labels,
    );
    assert.deepEqual(lines[1], [
      { kind: 'text', value: 'Sitz: Stuttgart' },
      { kind: 'missing', field: 'register_court' },
      { kind: 'missing', field: 'trade_register' },
      { kind: 'missing', field: 'managing_directors' },
    ]);
  });

  it('nicht eingetragener Betrieb: nur Name und Anschrift', () => {
    const lines = footerSegments(
      { ...gmbh, register_court: null, trade_register: '', managing_directors: [] },
      [],
      labels,
    );
    assert.equal(lines.length, 1);
  });

  it('ohne Rechtsform steht sie als fehlend in der zweiten Zeile', () => {
    const lines = footerSegments(
      { ...gmbh, register_court: null, trade_register: null, managing_directors: [] },
      ['legal_form'],
      labels,
    );
    assert.deepEqual(lines[1], [{ kind: 'missing', field: 'legal_form' }]);
  });
});
