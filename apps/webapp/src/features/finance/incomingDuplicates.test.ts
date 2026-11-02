import assert from 'node:assert/strict';
import { test } from 'node:test';

import { duplicateReason, indexDuplicates } from './incomingDuplicates.ts';

const row = {
  kind: 'invoice',
  id: 'a',
  match: 'number',
  other_kind: 'invoice',
  other_id: 'b',
  other_label: ' Muster GmbH RE-1 ',
};

test('gruppiert Treffer je Eintrag und trennt Belege von Anhängen', () => {
  const index = indexDuplicates([
    row,
    { ...row, other_id: 'c', match: 'file', other_kind: 'file', other_label: 'a.pdf' },
    { ...row, kind: 'file', id: 'x', match: 'file', other_id: 'y' },
  ]);
  assert.equal(index.invoices.get('a')?.length, 2);
  assert.equal(index.invoices.get('a')?.[0]?.otherLabel, 'Muster GmbH RE-1');
  assert.equal(index.files.get('x')?.[0]?.otherId, 'y');
  assert.equal(index.files.get('a'), undefined);
});

test('verwirft Zeilen mit unbekannten oder fehlenden Werten', () => {
  const index = indexDuplicates([
    { ...row, kind: 'sonstiges' },
    { ...row, id: null },
    { ...row, other_id: null },
    { ...row, match: 'name' },
    { ...row, other_kind: 'mail' },
  ]);
  assert.equal(index.invoices.size, 0);
  assert.equal(index.files.size, 0);
});

test('fehlende Bezeichnung wird leer', () => {
  const index = indexDuplicates([{ ...row, other_label: null }]);
  assert.equal(index.invoices.get('a')?.[0]?.otherLabel, '');
});

test('dieselbe Datei geht im Kennzeichen vor', () => {
  const number = { match: 'number', otherKind: 'invoice', otherId: 'b', otherLabel: '' } as const;
  const file = { ...number, match: 'file' } as const;
  assert.equal(duplicateReason([]), null);
  assert.equal(duplicateReason([number]), 'number');
  assert.equal(duplicateReason([number, file]), 'file');
});
