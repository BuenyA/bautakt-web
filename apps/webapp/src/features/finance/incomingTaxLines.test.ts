import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  guessTaxKind,
  initialTaxLines,
  parseTaxKind,
  TAX_KIND_OPTIONS,
  taxLinesPayload,
  validateTaxLines,
  vatDeviation,
  vatFor,
} from './incomingTaxLines.ts';

describe('parseTaxKind', () => {
  it('alle angebotenen Arten', () => {
    for (const kind of TAX_KIND_OPTIONS) assert.notEqual(parseTaxKind(kind), null);
    assert.deepEqual(parseTaxKind('reverse_charge|19'), { mode: 'reverse_charge', rate: 19 });
  });

  it('Unbekanntes nicht', () => {
    assert.equal(parseTaxKind('vat|19'), null);
    assert.equal(parseTaxKind('standard|'), null);
    assert.equal(parseTaxKind('standard|x'), null);
    assert.equal(parseTaxKind('standard|19|1'), null);
  });
});

describe('vatFor', () => {
  it('halber Cent wird aufgerundet, wie round(…, 2)', () => {
    assert.equal(vatFor(12345, 19), 2346); // 23,4555
    assert.equal(vatFor(50, 7), 4); // 3,5
    assert.equal(vatFor(0, 19), 0);
  });
});

describe('guessTaxKind', () => {
  it('19 % und 7 % auf den Cent', () => {
    assert.equal(guessTaxKind(10000, 1900), 'standard|19');
    assert.equal(guessTaxKind(12345, 2346), 'standard|19');
    assert.equal(guessTaxKind(10000, 700), 'standard|7');
  });

  it('0 € Steuer, Mischsatz oder leer: nichts geraten', () => {
    assert.equal(guessTaxKind(10000, 0), null);
    assert.equal(guessTaxKind(15000, 2250), null);
    assert.equal(guessTaxKind(null, 1900), null);
    assert.equal(guessTaxKind(0, 0), null);
  });
});

describe('validateTaxLines', () => {
  const header = { netMinor: 15000, vatMinor: 2250 };

  it('ein Satz: Beträge aus dem Kopf', () => {
    assert.deepEqual(
      validateTaxLines(
        [{ kind: 'standard|19', netMinor: null, vatMinor: null }],
        { netMinor: 10000, vatMinor: 1900 },
        'open',
      ),
      [],
    );
  });

  it('Erfassen braucht eine Steuerart, der Entwurf nicht', () => {
    const lines = [{ kind: null, netMinor: null, vatMinor: null }];
    assert.deepEqual(validateTaxLines(lines, header, 'open'), ['kindRequired']);
    assert.deepEqual(validateTaxLines(lines, header, 'draft'), []);
  });

  it('§13b, steuerfrei und Kleinunternehmer ohne Steuer', () => {
    const rc = [{ kind: 'reverse_charge|19' as const, netMinor: null, vatMinor: null }];
    assert.deepEqual(validateTaxLines(rc, { netMinor: 1000, vatMinor: 0 }, 'open'), []);
    assert.deepEqual(validateTaxLines(rc, { netMinor: 1000, vatMinor: 190 }, 'open'), [
      'vatNotAllowed',
    ]);
    const free = [{ kind: 'tax_free|0' as const, netMinor: null, vatMinor: null }];
    assert.deepEqual(validateTaxLines(free, { netMinor: 1000, vatMinor: 10 }, 'draft'), [
      'vatNotAllowed',
    ]);
  });

  it('Regelsteuer mit 0 € Steuer ist verdächtig', () => {
    const lines = [{ kind: 'standard|19' as const, netMinor: null, vatMinor: null }];
    assert.deepEqual(validateTaxLines(lines, { netMinor: 1000, vatMinor: 0 }, 'open'), [
      'vatMissing',
    ]);
  });

  it('mehrere Sätze: Summe = Kopf auf den Cent', () => {
    const lines = [
      { kind: 'standard|19' as const, netMinor: 10000, vatMinor: 1900 },
      { kind: 'standard|7' as const, netMinor: 5000, vatMinor: 350 },
    ];
    assert.deepEqual(validateTaxLines(lines, header, 'open'), []);
    assert.deepEqual(validateTaxLines(lines, { netMinor: 15001, vatMinor: 2250 }, 'open'), [
      'sumMismatch',
    ]);
    // Im Entwurf darf die Summe noch abweichen.
    assert.deepEqual(validateTaxLines(lines, { netMinor: 15001, vatMinor: 2250 }, 'draft'), []);
  });

  it('mehrere Sätze: Beträge je Zeile Pflicht, kein Satz doppelt', () => {
    assert.deepEqual(
      validateTaxLines(
        [
          { kind: 'standard|19', netMinor: 10000, vatMinor: 1900 },
          { kind: 'standard|19', netMinor: null, vatMinor: 350 },
        ],
        header,
        'draft',
      ),
      ['duplicate', 'amountRequired'],
    );
  });
});

describe('vatDeviation', () => {
  it('Abweichung in Cent, nur bei Regelsteuer', () => {
    assert.equal(vatDeviation({ kind: 'standard|19', netMinor: 10000, vatMinor: 1902 }), 2);
    assert.equal(vatDeviation({ kind: 'standard|19', netMinor: 10000, vatMinor: 1900 }), 0);
    assert.equal(vatDeviation({ kind: 'reverse_charge|19', netMinor: 10000, vatMinor: 0 }), 0);
  });
});

describe('taxLinesPayload', () => {
  it('ein Satz: Beträge aus dem Kopf, in Euro', () => {
    assert.deepEqual(
      taxLinesPayload([{ kind: 'reverse_charge|19', netMinor: null, vatMinor: null }], {
        netMinor: 123456,
        vatMinor: 0,
      }),
      [{ tax_mode: 'reverse_charge', tax_rate_percent: 19, net_amount: 1234.56, vat_amount: 0 }],
    );
  });

  it('mehrere Sätze: Beträge je Zeile', () => {
    assert.deepEqual(
      taxLinesPayload(
        [
          { kind: 'standard|19', netMinor: 10000, vatMinor: 1900 },
          { kind: 'standard|7', netMinor: 5000, vatMinor: 350 },
        ],
        { netMinor: 0, vatMinor: 0 },
      ),
      [
        { tax_mode: 'standard', tax_rate_percent: 19, net_amount: 100, vat_amount: 19 },
        { tax_mode: 'standard', tax_rate_percent: 7, net_amount: 50, vat_amount: 3.5 },
      ],
    );
  });

  it('ohne Steuerart oder Beträge: nichts', () => {
    assert.deepEqual(
      taxLinesPayload([{ kind: null, netMinor: null, vatMinor: null }], {
        netMinor: 1,
        vatMinor: 0,
      }),
      [],
    );
    assert.deepEqual(
      taxLinesPayload([{ kind: 'standard|19', netMinor: null, vatMinor: null }], {
        netMinor: null,
        vatMinor: null,
      }),
      [],
    );
  });
});

describe('initialTaxLines', () => {
  it('ohne Gespeichertes: aus dem Kopf erraten', () => {
    assert.deepEqual(initialTaxLines([], { netMinor: 10000, vatMinor: 700 }), [
      { kind: 'standard|7', netMinor: null, vatMinor: null },
    ]);
    assert.deepEqual(initialTaxLines([], { netMinor: 10000, vatMinor: 0 }), [
      { kind: null, netMinor: null, vatMinor: null },
    ]);
  });

  it('ein gespeicherter Satz: nur die Art, mehrere: mit Beträgen', () => {
    assert.deepEqual(
      initialTaxLines([{ kind: 'reverse_charge|19', netMinor: 1000, vatMinor: 0 }], {
        netMinor: 1000,
        vatMinor: 0,
      }),
      [{ kind: 'reverse_charge|19', netMinor: null, vatMinor: null }],
    );
    const two = [
      { kind: 'standard|19' as const, netMinor: 10000, vatMinor: 1900 },
      { kind: 'standard|7' as const, netMinor: 5000, vatMinor: 350 },
    ];
    assert.deepEqual(initialTaxLines(two, { netMinor: 15000, vatMinor: 2250 }), two);
  });
});
