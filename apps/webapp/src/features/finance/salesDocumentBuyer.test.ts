/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { salesDocumentBuyerLabel } from './salesDocumentBuyer.ts';

const customer = {
  contact: { kind: 'company', company_name: 'Neu GmbH', first_name: '', last_name: '' },
};

describe('salesDocumentBuyerLabel', () => {
  it('festgeschrieben: was auf dem Beleg steht, auch wenn der Kontakt umbenannt wurde', () => {
    assert.equal(
      salesDocumentBuyerLabel({ status: 'issued', buyer_name: 'Alt GmbH', customer }),
      'Alt GmbH',
    );
  });
  it('Entwurf: der Kontakt, wie er jetzt ist', () => {
    assert.equal(
      salesDocumentBuyerLabel({ status: 'draft', buyer_name: '', customer }),
      'Neu GmbH',
    );
  });
  it('ohne Kunde und ohne Kopie: leer', () => {
    assert.equal(salesDocumentBuyerLabel({ status: 'draft', buyer_name: '', customer: null }), '');
  });
});
