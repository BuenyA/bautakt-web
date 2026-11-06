/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { COMPANY_TYPES } from './companyValidation.ts';

describe('COMPANY_TYPES', () => {
  it('bietet Rohbau als gespeicherten String an', () => {
    assert.ok(COMPANY_TYPES.includes('Rohbau'));
    assert.equal(
      COMPANY_TYPES.find((type) => type.toLowerCase() === 'rohbau'),
      'Rohbau',
    );
  });

  it('steht alphabetisch zwischen Metallbau und Sanitär', () => {
    const index = COMPANY_TYPES.indexOf('Rohbau');
    assert.equal(COMPANY_TYPES[index - 1], 'Metallbau');
    assert.equal(COMPANY_TYPES[index + 1], 'Sanitär, Heizung & Klima');
  });

  it('bleibt streng nach deutscher Sortierung geordnet', () => {
    const sorted = [...COMPANY_TYPES].sort((a, b) => a.localeCompare(b, 'de'));
    assert.deepEqual([...COMPANY_TYPES], sorted);
  });
});
