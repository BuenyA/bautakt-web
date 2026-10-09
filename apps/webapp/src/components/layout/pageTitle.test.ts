/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDocumentTitle } from './pageTitle.ts';

describe('formatDocumentTitle', () => {
  it('hängt den App-Namen mit Mittelpunkt an', () => {
    assert.equal(formatDocumentTitle('Aufträge', 'Bautakt'), 'Aufträge · Bautakt');
  });

  it('übernimmt Objektnamen unverändert', () => {
    assert.equal(formatDocumentTitle('RE00002', 'Bautakt'), 'RE00002 · Bautakt');
  });

  it('schneidet Leerraum ab', () => {
    assert.equal(formatDocumentTitle('  Musterauftrag ', 'Bautakt'), 'Musterauftrag · Bautakt');
  });

  it('zeigt ohne Seitennamen nur den App-Namen', () => {
    assert.equal(formatDocumentTitle(null, 'Bautakt'), 'Bautakt');
    assert.equal(formatDocumentTitle(undefined, 'Bautakt'), 'Bautakt');
    assert.equal(formatDocumentTitle('   ', 'Bautakt'), 'Bautakt');
  });
});
