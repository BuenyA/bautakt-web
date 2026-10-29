/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attachmentFileName, parseRecipients } from './sendMail.ts';

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
