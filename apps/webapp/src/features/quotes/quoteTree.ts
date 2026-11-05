/**
 * Gliederung und Summen des Angebotseditors (bautakt-web#292).
 *
 * Der Baum liegt im Editor als flache Liste in Lesereihenfolge: jeder Knoten
 * steht vor seinen Kindern, Kinder eines Titels folgen ihm lückenlos. Die
 * Ebene ergibt sich aus `parentId`. So bleibt Drag & Drop eine Verschiebung
 * in einer Liste, und die Datenbank bekommt `parent_id` und `sort_order`.
 *
 * Bewusst ohne Import aus `@bautakt/finance`: Die Node-Tests laden die Datei
 * direkt, und die Rundung muss genau der von `issue_quote_version` folgen.
 */

export const NODE_TYPES = ['title', 'position', 'text'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const POSITION_TYPES = ['normal', 'lump_sum', 'alternative', 'contingency'] as const;
export type PositionType = (typeof POSITION_TYPES)[number];

export const CONTINGENCY_MODES = ['with_total', 'unit_price_only'] as const;
export type ContingencyMode = (typeof CONTINGENCY_MODES)[number];

/**
 * OZ-Maske „11.22.3333“: zwei Titelebenen mit je zwei Stellen, Positionen mit
 * vier Stellen in Zehnerschritten. Titel stehen also auf Ebene 0 (Titel) und 1
 * (Untertitel), Positionen und Texte höchstens auf Ebene 2.
 */
export const MAX_TITLE_DEPTH = 1;
export const MAX_DEPTH = MAX_TITLE_DEPTH + 1;
export const POSITION_STEP = 10;

export type QuoteNode = {
  /** Bleibt über das Speichern hinweg gleich; der Client gibt die ID mit. */
  id: string;
  parentId: string | null;
  nodeType: NodeType;
  /** Nur bei Positionen gesetzt. */
  positionType: PositionType | null;
  contingencyMode: ContingencyMode | null;
  alternativeToId: string | null;
  shortText: string;
  longText: string;
  /** Rohtext aus dem Feld, umgerechnet wird erst beim Rechnen und Speichern. */
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRatePercent: string;
  laborShare: string;
  priceIsManual: boolean;
  origin: string;
  originRefId: string | null;
  copiedFromItemId: string | null;
};

export type FlatNode = QuoteNode & { depth: number; oz: string };

/** Deutsche Zahl („1.234,56“) als Zahl, Unlesbares wird 0. Wie im Rechnungseditor. */
export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(/\s/g, '');
  if (!normalized) return 0;
  const parsed = Number(
    normalized.includes(',') ? normalized.replace(/\./g, '').replace(',', '.') : normalized,
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

export function decimalText(value: number, digits = 4): string {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor).replace('.', ',');
}

export function moneyText(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function newNode(
  nodeType: NodeType,
  parentId: string | null,
  taxRatePercent = '19',
  id: string = crypto.randomUUID(),
): QuoteNode {
  const isPosition = nodeType === 'position';
  return {
    id,
    parentId,
    nodeType,
    positionType: isPosition ? 'normal' : null,
    contingencyMode: null,
    alternativeToId: null,
    shortText: '',
    longText: '',
    quantity: isPosition ? '1' : '0',
    unit: '',
    unitPrice: '',
    taxRatePercent: isPosition ? taxRatePercent : '0',
    laborShare: '',
    priceIsManual: false,
    origin: 'manual',
    originRefId: null,
    copiedFromItemId: null,
  };
}

/** Wechsel der Positionsart, mit den Folgen, die die Datenbank verlangt. */
export function withPositionType(node: QuoteNode, positionType: PositionType): QuoteNode {
  return {
    ...node,
    positionType,
    contingencyMode: positionType === 'contingency' ? (node.contingencyMode ?? 'with_total') : null,
    alternativeToId: positionType === 'alternative' ? node.alternativeToId : null,
    // Eine Pauschale ist ein Betrag: Menge 1, Einheit „psch“.
    quantity: positionType === 'lump_sum' ? '1' : node.quantity,
    unit: positionType === 'lump_sum' ? 'psch' : node.unit,
  };
}

// ---------------------------------------------------------------------------
// Struktur
// ---------------------------------------------------------------------------

function depthMap(nodes: readonly QuoteNode[]): Map<string, number> {
  const depth = new Map<string, number>();
  for (const node of nodes) {
    depth.set(node.id, node.parentId ? (depth.get(node.parentId) ?? 0) + 1 : 0);
  }
  return depth;
}

/** Ebene und OZ je Knoten, in Lesereihenfolge. Texte haben keine OZ. */
export function flatten(nodes: readonly QuoteNode[]): FlatNode[] {
  const depth = depthMap(nodes);
  const ozById = new Map<string, string>();
  const titleCount = new Map<string | null, number>();
  const positionCount = new Map<string | null, number>();

  return nodes.map((node) => {
    const parentOz = node.parentId ? (ozById.get(node.parentId) ?? '') : '';
    let oz = '';
    if (node.nodeType === 'title') {
      const index = (titleCount.get(node.parentId) ?? 0) + 1;
      titleCount.set(node.parentId, index);
      oz = [parentOz, String(index).padStart(2, '0')].filter(Boolean).join('.');
    } else if (node.nodeType === 'position') {
      const index = (positionCount.get(node.parentId) ?? 0) + 1;
      positionCount.set(node.parentId, index);
      oz = [parentOz, String(index * POSITION_STEP).padStart(4, '0')].filter(Boolean).join('.');
    }
    ozById.set(node.id, oz);
    return { ...node, depth: depth.get(node.id) ?? 0, oz };
  });
}

/** Index des Knotens und aller seiner Nachfahren: `[start, end)`. */
export function subtreeRange(nodes: readonly QuoteNode[], id: string): [number, number] {
  const start = nodes.findIndex((node) => node.id === id);
  if (start < 0) return [-1, -1];
  const inside = new Set([id]);
  let end = start + 1;
  while (end < nodes.length && inside.has(nodes[end]!.parentId ?? '')) {
    inside.add(nodes[end]!.id);
    end += 1;
  }
  return [start, end];
}

/** Höhe der Titel unterhalb eines Titels: 0 ohne Untertitel, 1 mit. */
function titleHeight(nodes: readonly QuoteNode[], id: string): number {
  const [start, end] = subtreeRange(nodes, id);
  const depth = depthMap(
    nodes.slice(start, end).map((node, i) => (i === 0 ? { ...node, parentId: null } : node)),
  );
  let height = 0;
  for (const node of nodes.slice(start + 1, end)) {
    if (node.nodeType === 'title') height = Math.max(height, depth.get(node.id) ?? 0);
  }
  return height;
}

function deepestBelow(nodes: readonly QuoteNode[], id: string): number {
  const [start, end] = subtreeRange(nodes, id);
  const slice = nodes
    .slice(start, end)
    .map((node, i) => (i === 0 ? { ...node, parentId: null } : node));
  return Math.max(0, ...depthMap(slice).values());
}

/** Höchste Ebene, auf der ein Knoten samt Kindern stehen darf. */
export function maxDepthFor(nodes: readonly QuoteNode[], id: string): number {
  const node = nodes.find((n) => n.id === id);
  if (!node) return 0;
  if (node.nodeType !== 'title') return MAX_DEPTH;
  return Math.min(MAX_TITLE_DEPTH - titleHeight(nodes, id), MAX_DEPTH - deepestBelow(nodes, id));
}

export type Projection = { depth: number; parentId: string | null };

/**
 * Wohin ein gezogener Knoten fällt: Er landet an der Stelle von `overId`, die
 * Ebene folgt dem waagerechten Versatz (`offsetLevels`), begrenzt durch die
 * Nachbarn. Eltern sind immer Titel; eine Position darf nicht unter eine
 * Position rutschen. Muster aus dem Baum-Beispiel von dnd-kit.
 */
export function projectDrop(
  nodes: readonly QuoteNode[],
  activeId: string,
  overId: string,
  offsetLevels: number,
): Projection | null {
  const flat = flatten(nodes);
  const [start, end] = subtreeRange(nodes, activeId);
  if (start < 0) return null;
  const active = flat[start]!;
  const rest = flat.filter((_, i) => i < start || i >= end);
  const overIndexInFlat = flat.findIndex((n) => n.id === overId);
  if (overIndexInFlat < 0) return null;

  // Position in der Liste ohne den gezogenen Teilbaum.
  let insertAt: number;
  if (overIndexInFlat >= start && overIndexInFlat < end) {
    insertAt = start;
  } else {
    const overInRest = rest.findIndex((n) => n.id === overId);
    insertAt = overIndexInFlat > start ? overInRest + 1 : overInRest;
  }
  // Nie mitten in einen fremden Teilbaum hinter dessen Kinder schneiden ist
  // erlaubt: Die Ebene regelt das, wie im Beispiel von dnd-kit.
  const previous = rest[insertAt - 1];
  const next = rest[insertAt];

  const wanted = active.depth + offsetLevels;
  const maxByPrevious = previous
    ? previous.nodeType === 'title'
      ? previous.depth + 1
      : previous.depth
    : 0;
  const minByNext = next ? next.depth : 0;
  const limit = maxDepthFor(nodes, activeId);
  const upper = Math.min(maxByPrevious, limit);
  let depth = Math.max(Math.min(wanted, upper), Math.min(minByNext, upper));
  depth = Math.max(0, depth);

  let parentId: string | null = null;
  if (depth > 0) {
    for (let i = insertAt - 1; i >= 0; i -= 1) {
      const candidate = rest[i]!;
      if (candidate.depth === depth - 1) {
        parentId = candidate.id;
        break;
      }
    }
    if (parentId === null) depth = 0;
  }
  return { depth, parentId };
}

/** Führt eine Projektion aus: Teilbaum verschieben und Eltern setzen. */
export function moveNode(
  nodes: readonly QuoteNode[],
  activeId: string,
  overId: string,
  projection: Projection,
): QuoteNode[] {
  const [start, end] = subtreeRange(nodes, activeId);
  if (start < 0) return [...nodes];
  const block = nodes
    .slice(start, end)
    .map((node, i) => (i === 0 ? { ...node, parentId: projection.parentId } : node));
  const rest = [...nodes.slice(0, start), ...nodes.slice(end)];
  const overIndex = nodes.findIndex((n) => n.id === overId);
  let insertAt: number;
  if (overIndex >= start && overIndex < end) {
    insertAt = start;
  } else {
    const overInRest = rest.findIndex((n) => n.id === overId);
    insertAt = overIndex > start ? overInRest + 1 : overInRest;
  }
  // Gehört der neue Elternteil zum Block davor, rutscht der Block hinter dessen
  // letzte Kinder nicht vor sie: Lesereihenfolge bleibt gültig.
  const result = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
  return normalizeOrder(result);
}

/**
 * Stellt die Lesereihenfolge her: Kinder folgen ihrem Elternteil, die
 * Reihenfolge unter Geschwistern bleibt. Verwaiste Knoten wandern nach oben.
 */
export function normalizeOrder(nodes: readonly QuoteNode[]): QuoteNode[] {
  const ids = new Set(nodes.map((n) => n.id));
  const children = new Map<string | null, QuoteNode[]>();
  for (const node of nodes) {
    const parent = node.parentId && ids.has(node.parentId) ? node.parentId : null;
    const list = children.get(parent) ?? [];
    list.push(parent === node.parentId ? node : { ...node, parentId: null });
    children.set(parent, list);
  }
  const out: QuoteNode[] = [];
  const visit = (parent: string | null) => {
    for (const node of children.get(parent) ?? []) {
      out.push(node);
      visit(node.id);
    }
  };
  visit(null);
  return out;
}

/** Fügt einen Knoten hinter `afterId` ein (hinter dessen Kinder), sonst ans Ende. */
export function insertAfter(
  nodes: readonly QuoteNode[],
  node: QuoteNode,
  afterId: string | null,
): QuoteNode[] {
  if (!afterId) return [...nodes, node];
  const [, end] = subtreeRange(nodes, afterId);
  if (end < 0) return [...nodes, node];
  return [...nodes.slice(0, end), node, ...nodes.slice(end)];
}

/** Entfernt einen Knoten samt Kindern; Verweise von Alternativen fallen weg. */
export function removeNode(nodes: readonly QuoteNode[], id: string): QuoteNode[] {
  const [start, end] = subtreeRange(nodes, id);
  if (start < 0) return [...nodes];
  const removed = new Set(nodes.slice(start, end).map((n) => n.id));
  return [...nodes.slice(0, start), ...nodes.slice(end)].map((node) =>
    node.alternativeToId && removed.has(node.alternativeToId)
      ? { ...node, alternativeToId: null }
      : node,
  );
}

/** Was der Editor anlegen kann: Untertitel sind Titel auf Ebene 1. */
export type AddKind = 'title' | 'subtitle' | 'position' | 'text';

function ancestorAtDepth(flat: readonly FlatNode[], id: string, depth: number): FlatNode | null {
  const byId = new Map(flat.map((n) => [n.id, n]));
  let current = byId.get(id) ?? null;
  while (current && current.depth > depth) current = byId.get(current.parentId ?? '') ?? null;
  return current && current.depth === depth ? current : null;
}

function lastDescendant(nodes: readonly QuoteNode[], id: string): string {
  const [start, end] = subtreeRange(nodes, id);
  return end - 1 > start ? nodes[end - 1]!.id : id;
}

/** Untertitel gehen nur, wenn die Auswahl in einem Titel der obersten Ebene liegt. */
export function canAddSubtitle(nodes: readonly QuoteNode[], selectedId: string | null): boolean {
  if (!selectedId) return false;
  const root = ancestorAtDepth(flatten(nodes), selectedId, 0);
  return root?.nodeType === 'title';
}

/**
 * Wo ein neuer Knoten hinkommt. Titel stehen immer oben, hinter dem Block der
 * Auswahl. Untertitel kommen ans Ende des Titels der Auswahl. Positionen und
 * Texte landen in einem gewählten Titel ganz unten, sonst direkt hinter der
 * gewählten Zeile.
 */
export function placementFor(
  nodes: readonly QuoteNode[],
  kind: AddKind,
  selectedId: string | null,
): { parentId: string | null; afterId: string | null } {
  const flat = flatten(nodes);
  const selected = flat.find((n) => n.id === selectedId);
  if (!selected) return { parentId: null, afterId: null };

  if (kind === 'title') {
    const root = ancestorAtDepth(flat, selected.id, 0);
    return { parentId: null, afterId: root?.id ?? null };
  }
  if (kind === 'subtitle') {
    const root = ancestorAtDepth(flat, selected.id, 0);
    if (!root || root.nodeType !== 'title') return { parentId: null, afterId: null };
    return { parentId: root.id, afterId: lastDescendant(nodes, root.id) };
  }
  if (selected.nodeType === 'title') {
    return { parentId: selected.id, afterId: lastDescendant(nodes, selected.id) };
  }
  return { parentId: selected.parentId, afterId: selected.id };
}

// ---------------------------------------------------------------------------
// Summen
// ---------------------------------------------------------------------------

function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value >= 0 ? Math.round(value) : -Math.round(-value);
}

function toMinor(value: number): number {
  return roundHalfAwayFromZero(value * 100);
}

/** Gesamtbetrag einer Position in Cent: Menge mal Einzelpreis, einmal gerundet. */
export function nodeTotalMinor(node: Pick<QuoteNode, 'quantity' | 'unitPrice'>): number {
  // Wie `round(quantity * unit_price, 2)` in der Datenbank. Erst in Cent und
  // dann mit der Menge in Zehntausendsteln, damit 0,1 + 0,2 nicht driftet.
  const priceMinor = toMinor(parseDecimal(node.unitPrice));
  const quantityMilli = roundHalfAwayFromZero(parseDecimal(node.quantity) * 10000);
  return roundHalfAwayFromZero((priceMinor * quantityMilli) / 10000);
}

/** Zählt die Position zur Angebotssumme? Alternativ und Bedarf nie. */
export function countsToTotal(node: QuoteNode): boolean {
  return (
    node.nodeType === 'position' &&
    (node.positionType === 'normal' || node.positionType === 'lump_sum')
  );
}

export type QuoteTotals = {
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  /** Nettosumme vor dem Nachlass. */
  subtotalMinor: number;
  discountMinor: number;
  laborShareMinor: number;
  byRate: { rate: number; netMinor: number; vatMinor: number }[];
  /** Nicht in der Summe: Alternativen und Bedarfspositionen mit Gesamtbetrag. */
  alternativeMinor: number;
  contingencyMinor: number;
};

/**
 * Summen wie `issue_quote_version`: je Steuersatz die gerundeten Positionen,
 * dann der Nachlass je Gruppe gerundet, dann die Umsatzsteuer je Gruppe.
 * Außerhalb von `standard` gibt es keine Umsatzsteuer.
 */
export function quoteTotals(
  nodes: readonly QuoteNode[],
  taxMode: string,
  discountPercent: number,
): QuoteTotals {
  const groups = new Map<number, number>();
  let subtotalMinor = 0;
  let laborMinor = 0;
  let alternativeMinor = 0;
  let contingencyMinor = 0;

  for (const node of nodes) {
    if (node.nodeType !== 'position') continue;
    const total = nodeTotalMinor(node);
    if (countsToTotal(node)) {
      const rate = parseDecimal(node.taxRatePercent);
      groups.set(rate, (groups.get(rate) ?? 0) + total);
      subtotalMinor += total;
      laborMinor += toMinor(parseDecimal(node.laborShare));
    } else if (node.positionType === 'alternative') {
      alternativeMinor += total;
    } else if (node.positionType === 'contingency' && node.contingencyMode === 'with_total') {
      contingencyMinor += total;
    }
  }

  // Nachlass in Hundertstelprozent, damit 12,5 % genau bleibt.
  const keepBasis = 10000 - roundHalfAwayFromZero(discountPercent * 100);
  const applyDiscount = (minor: number) => roundHalfAwayFromZero((minor * keepBasis) / 10000);

  let netMinor = 0;
  let vatMinor = 0;
  const byRate: QuoteTotals['byRate'] = [];
  for (const [rate, groupMinor] of [...groups.entries()].sort((a, b) => b[0] - a[0])) {
    const net = applyDiscount(groupMinor);
    const vat =
      taxMode === 'standard'
        ? roundHalfAwayFromZero((net * Math.round(rate * 10000)) / 1000000)
        : 0;
    netMinor += net;
    vatMinor += vat;
    byRate.push({ rate, netMinor: net, vatMinor: vat });
  }

  return {
    netMinor,
    vatMinor,
    grossMinor: netMinor + vatMinor,
    subtotalMinor,
    discountMinor: subtotalMinor - netMinor,
    laborShareMinor: applyDiscount(laborMinor),
    byRate,
    alternativeMinor,
    contingencyMinor,
  };
}

/** Summe eines Titels samt Untertiteln, nur was zur Angebotssumme zählt. */
export function titleTotalsMinor(nodes: readonly QuoteNode[]): Map<string, number> {
  const parent = new Map(nodes.map((n) => [n.id, n.parentId]));
  const sums = new Map<string, number>();
  for (const node of nodes) {
    if (!countsToTotal(node)) continue;
    const total = nodeTotalMinor(node);
    let up = node.parentId;
    while (up) {
      sums.set(up, (sums.get(up) ?? 0) + total);
      up = parent.get(up) ?? null;
    }
  }
  return sums;
}

/**
 * Vorschlag für die Abrechnungsart des späteren Auftrags (Plan, Abschnitt 4):
 * nur Pauschalen ergibt `fixed`, sonst `unit_price`. `regie` nur von Hand.
 */
export function suggestBillingMode(
  nodes: readonly QuoteNode[],
  current: string,
): 'regie' | 'fixed' | 'unit_price' {
  if (current === 'regie') return 'regie';
  const counted = nodes.filter(countsToTotal);
  if (counted.length > 0 && counted.every((n) => n.positionType === 'lump_sum')) return 'fixed';
  return 'unit_price';
}

// ---------------------------------------------------------------------------
// Datenbank
// ---------------------------------------------------------------------------

export type QuoteItemRow = {
  id: string;
  parent_id: string | null;
  sort_order: number;
  oz: string;
  node_type: string;
  position_type: string | null;
  contingency_mode: string | null;
  alternative_to_id: string | null;
  short_text: string;
  long_text: string;
  quantity: number;
  unit: string;
  unit_price: number;
  price_is_manual: boolean;
  tax_rate_percent: number;
  tax_category: string;
  labor_share: number;
  origin: string;
  origin_ref_id: string | null;
  copied_from_item_id: string | null;
};

function asNodeType(value: string): NodeType {
  return (NODE_TYPES as readonly string[]).includes(value) ? (value as NodeType) : 'text';
}

/** Zeilen aus der Datenbank, sortiert nach `sort_order`, als Editorliste. */
export function nodesFromRows(rows: readonly QuoteItemRow[]): QuoteNode[] {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  return normalizeOrder(
    sorted.map((row) => {
      const nodeType = asNodeType(row.node_type);
      return {
        id: row.id,
        parentId: row.parent_id,
        nodeType,
        positionType:
          nodeType === 'position' ? ((row.position_type as PositionType) ?? 'normal') : null,
        contingencyMode: (row.contingency_mode as ContingencyMode | null) ?? null,
        alternativeToId: row.alternative_to_id,
        shortText: row.short_text,
        longText: row.long_text,
        quantity: decimalText(Number(row.quantity)),
        unit: row.unit,
        unitPrice: nodeType === 'position' ? moneyText(Number(row.unit_price)) : '',
        taxRatePercent: decimalText(Number(row.tax_rate_percent)),
        laborShare: Number(row.labor_share) ? moneyText(Number(row.labor_share)) : '',
        priceIsManual: row.price_is_manual,
        origin: row.origin,
        originRefId: row.origin_ref_id,
        copiedFromItemId: row.copied_from_item_id,
      };
    }),
  );
}

/**
 * Zeilen für `save_quote_draft`. Die Steuerart steht wie bei Rechnungen an
 * jeder Position (`tax_category`), der Satz ist außerhalb von `standard` 0.
 */
export function rowsFromNodes(nodes: readonly QuoteNode[], taxMode: string) {
  const ordered = normalizeOrder(nodes);
  return flatten(ordered).map((node, index) => {
    const isPosition = node.nodeType === 'position';
    return {
      id: node.id,
      parent_id: node.parentId,
      sort_order: index,
      oz: node.oz,
      node_type: node.nodeType,
      position_type: isPosition ? node.positionType : null,
      contingency_mode:
        isPosition && node.positionType === 'contingency' ? node.contingencyMode : null,
      alternative_to_id:
        isPosition && node.positionType === 'alternative' ? node.alternativeToId : null,
      short_text: node.shortText.trim(),
      long_text: node.longText.trim(),
      quantity: isPosition ? parseDecimal(node.quantity) : 0,
      unit: isPosition ? node.unit.trim() : '',
      unit_price: isPosition ? toMinor(parseDecimal(node.unitPrice)) / 100 : 0,
      price_is_manual: node.priceIsManual,
      tax_rate_percent:
        isPosition && taxMode === 'standard' ? parseDecimal(node.taxRatePercent) : 0,
      tax_category: taxMode,
      labor_share: isPosition ? toMinor(parseDecimal(node.laborShare)) / 100 : 0,
      origin: node.origin,
      origin_ref_id: node.originRefId,
      copied_from_item_id: node.copiedFromItemId,
    };
  });
}
