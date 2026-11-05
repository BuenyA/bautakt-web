import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canAddSubtitle,
  flatten,
  insertAfter,
  maxDepthFor,
  moveNode,
  newNode,
  nodesFromRows,
  nodeTotalMinor,
  placementFor,
  projectDrop,
  type QuoteNode,
  quoteTotals,
  removeNode,
  rowsFromNodes,
  suggestBillingMode,
  titleTotalsMinor,
  withPositionType,
} from './quoteTree.ts';

function title(id: string, parentId: string | null = null): QuoteNode {
  return { ...newNode('title', parentId, '19', id), shortText: id };
}
function pos(
  id: string,
  parentId: string | null,
  quantity: string,
  unitPrice: string,
  extra: Partial<QuoteNode> = {},
): QuoteNode {
  return {
    ...newNode('position', parentId, '19', id),
    shortText: id,
    quantity,
    unitPrice,
    ...extra,
  };
}

const tree = (): QuoteNode[] => [
  title('T1'),
  title('T1.1', 'T1'),
  pos('P1', 'T1.1', '2', '10'),
  pos('P2', 'T1.1', '1', '5'),
  title('T2'),
  pos('P3', 'T2', '3', '1,5'),
  { ...newNode('text', 'T2', '19', 'X1'), shortText: 'Hinweis' },
];

test('OZ nach Maske 11.22.3333, Texte ohne OZ', () => {
  const oz = Object.fromEntries(flatten(tree()).map((n) => [n.id, n.oz]));
  assert.deepEqual(oz, {
    T1: '01',
    'T1.1': '01.01',
    P1: '01.01.0010',
    P2: '01.01.0020',
    T2: '02',
    P3: '02.0010',
    X1: '',
  });
  assert.equal(flatten([pos('A', null, '1', '1')])[0]!.oz, '0010');
});

test('Untertitel nur eine Ebene tief, Titel mit Untertitel bleibt oben', () => {
  const nodes = tree();
  assert.equal(maxDepthFor(nodes, 'T1'), 0);
  assert.equal(maxDepthFor(nodes, 'T2'), 1);
  assert.equal(maxDepthFor(nodes, 'P1'), 2);
  // Titel stehen immer oben, hinter dem Block der Auswahl.
  assert.deepEqual(placementFor(nodes, 'title', 'P1'), { parentId: null, afterId: 'T1' });
  // Untertitel ans Ende des obersten Titels der Auswahl.
  assert.deepEqual(placementFor(nodes, 'subtitle', 'P1'), { parentId: 'T1', afterId: 'P2' });
  assert.deepEqual(placementFor(nodes, 'position', 'T2'), { parentId: 'T2', afterId: 'X1' });
  assert.deepEqual(placementFor(nodes, 'position', 'P1'), { parentId: 'T1.1', afterId: 'P1' });
  assert.equal(canAddSubtitle(nodes, 'P3'), true);
  assert.equal(canAddSubtitle([pos('A', null, '1', '1')], 'A'), false);
});

test('Verschieben: Position wandert in anderen Titel, Lesereihenfolge bleibt gültig', () => {
  const nodes = tree();
  // P1 nach unten auf P3 ziehen, ohne Versatz: wird Geschwister von P3.
  const projection = projectDrop(nodes, 'P1', 'P3', 0);
  assert.deepEqual(projection, { depth: 1, parentId: 'T2' });
  const moved = moveNode(nodes, 'P1', 'P3', projection!);
  assert.deepEqual(
    moved.map((n) => n.id),
    ['T1', 'T1.1', 'P2', 'T2', 'P3', 'P1', 'X1'],
  );
  assert.equal(moved.find((n) => n.id === 'P1')!.parentId, 'T2');
});

test('Verschieben: Titel nimmt seine Kinder mit, Positionen hängen nie an Positionen', () => {
  const nodes = tree();
  const projection = projectDrop(nodes, 'T2', 'T1', 0)!;
  assert.deepEqual(projection, { depth: 0, parentId: null });
  const moved = moveNode(nodes, 'T2', 'T1', projection);
  assert.deepEqual(
    moved.map((n) => n.id),
    ['T2', 'P3', 'X1', 'T1', 'T1.1', 'P1', 'P2'],
  );
  // Weit nach rechts gezogen unter eine Position: bleibt auf deren Ebene.
  const deeper = projectDrop(nodes, 'P3', 'P2', 5)!;
  assert.deepEqual(deeper, { depth: 2, parentId: 'T1.1' });
  // Titel mit Untertitel lässt sich nicht einrücken.
  assert.equal(projectDrop(nodes, 'T1', 'T1', 3)!.depth, 0);
});

test('Löschen nimmt Kinder mit und löst Verweise von Alternativen', () => {
  const nodes = [
    ...tree(),
    pos('A1', 'T2', '1', '1', { positionType: 'alternative', alternativeToId: 'P1' }),
  ];
  const left = removeNode(nodes, 'T1');
  assert.deepEqual(
    left.map((n) => n.id),
    ['T2', 'P3', 'X1', 'A1'],
  );
  assert.equal(left.find((n) => n.id === 'A1')!.alternativeToId, null);
  assert.deepEqual(
    insertAfter(left, title('T3'), 'T2').map((n) => n.id),
    ['T2', 'P3', 'X1', 'A1', 'T3'],
  );
});

test('Gesamtbetrag einmal kaufmännisch gerundet, krumme Mengen ohne Drift', () => {
  assert.equal(nodeTotalMinor({ quantity: '3', unitPrice: '0,10' }), 30);
  assert.equal(nodeTotalMinor({ quantity: '0,333', unitPrice: '1,5' }), 50);
  assert.equal(nodeTotalMinor({ quantity: '1,005', unitPrice: '1' }), 101);
  assert.equal(nodeTotalMinor({ quantity: '2,5', unitPrice: '1.234,56' }), 308640);
});

test('Summen wie issue_quote_version: Alternativ und Bedarf zählen nicht', () => {
  const nodes = [
    pos('N', null, '2', '100'),
    withPositionType(pos('L', null, '7', '50'), 'lump_sum'),
    pos('S', null, '1', '10', { taxRatePercent: '7' }),
    pos('A', null, '1', '999', { positionType: 'alternative', alternativeToId: 'N' }),
    pos('B', null, '2', '40', { positionType: 'contingency', contingencyMode: 'with_total' }),
    pos('C', null, '2', '40', { positionType: 'contingency', contingencyMode: 'unit_price_only' }),
  ];
  // Pauschale setzt die Menge auf 1.
  assert.equal(nodes[1]!.quantity, '1');
  const totals = quoteTotals(nodes, 'standard', 0);
  assert.equal(totals.netMinor, 26000);
  assert.equal(totals.vatMinor, 4750 + 70);
  assert.equal(totals.grossMinor, 26000 + 4820);
  assert.equal(totals.alternativeMinor, 99900);
  assert.equal(totals.contingencyMinor, 8000);
  assert.deepEqual(
    totals.byRate.map((g) => g.rate),
    [19, 7],
  );
});

test('Nachlass je Steuersatz gerundet, ohne Umsatzsteuer außerhalb von standard', () => {
  const nodes = [pos('N', null, '1', '0,05'), pos('M', null, '1', '33,33', { laborShare: '20' })];
  const totals = quoteTotals(nodes, 'standard', 10);
  // 33,38 × 0,9 = 30,042 → 30,04; USt 19 % = 5,7076 → 5,71
  assert.equal(totals.netMinor, 3004);
  assert.equal(totals.vatMinor, 571);
  assert.equal(totals.discountMinor, 334);
  assert.equal(totals.laborShareMinor, 1800);
  for (const mode of ['reverse_charge', 'tax_free', 'small_business']) {
    const other = quoteTotals(nodes, mode, 10);
    assert.equal(other.vatMinor, 0);
    assert.equal(other.grossMinor, 3004);
  }
});

test('Titelsummen und Vorschlag der Abrechnungsart', () => {
  const sums = titleTotalsMinor(tree());
  assert.equal(sums.get('T1.1'), 2500);
  assert.equal(sums.get('T1'), 2500);
  assert.equal(sums.get('T2'), 450);
  assert.equal(suggestBillingMode(tree(), 'unit_price'), 'unit_price');
  assert.equal(
    suggestBillingMode([withPositionType(pos('L', null, '1', '1'), 'lump_sum')], 'unit_price'),
    'fixed',
  );
  assert.equal(suggestBillingMode(tree(), 'regie'), 'regie');
});

test('Speichern und Laden ergeben denselben Baum, Steuerart an jeder Position', () => {
  const nodes = tree();
  const rows = rowsFromNodes(nodes, 'reverse_charge');
  assert.deepEqual(
    rows.map((r) => r.sort_order),
    [0, 1, 2, 3, 4, 5, 6],
  );
  assert.ok(rows.every((r) => r.tax_category === 'reverse_charge' && r.tax_rate_percent === 0));
  assert.equal(rows.find((r) => r.id === 'P1')!.oz, '01.01.0010');
  assert.equal(rows.find((r) => r.id === 'T1')!.position_type, null);

  const standardRows = rowsFromNodes(nodes, 'standard');
  const back = nodesFromRows(
    [...standardRows].reverse().map((r) => ({ ...r, unit_price: Number(r.unit_price) })),
  );
  assert.deepEqual(
    back.map((n) => [n.id, n.parentId, n.quantity, n.unitPrice]),
    nodes.map((n) => [
      n.id,
      n.parentId,
      n.nodeType === 'position' ? n.quantity : '0',
      n.nodeType === 'position' ? (n.unitPrice.includes(',') ? '1,50' : `${n.unitPrice},00`) : '',
    ]),
  );
});
