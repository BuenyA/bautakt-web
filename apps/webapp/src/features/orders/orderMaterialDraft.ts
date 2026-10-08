/**
 * Formularzustand für Material an einem Auftrag.
 *
 * Die Tabelle verlangt genau eines von `article_id` und `custom_title`
 * (getrimmt, nicht leer) und `quantity > 0`. `unit_cost` ist in der Datenbank
 * nullable; das Formular verlangt einen Einkaufspreis größer als 0, wie die
 * Handy-App. Der Verkaufspreis bleibt optional: leer heißt NULL, und die
 * Rechnung nimmt dann den Einkaufspreis.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert (Fast Refresh).
 */

export type OrderMaterialMode = 'article' | 'custom';

export type OrderMaterialDraft = {
  id?: string;
  orderId: string;
  mode: OrderMaterialMode;
  articleId: string;
  customTitle: string;
  /** Rohtext. Umgerechnet wird erst beim Speichern. */
  quantity: string;
  unit: string;
  unitCost: string;
  unitPrice: string;
  notes: string;
  /** `YYYY-MM-DD`. */
  usedAt: string;
  billed: boolean;
};

export type OrderMaterialIssue = 'article' | 'title' | 'quantity' | 'cost' | 'price' | 'date';

/** Spalten, die Insert und Update schreiben. Abrechnung, Bericht und Icon nie. */
export type MaterialWrite = {
  article_id: string | null;
  custom_title: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  unit_price: number | null;
  notes: string;
  used_at: string;
};

export type ArticleChoice = {
  id: string;
  unit: string;
  salePrice: number | null;
  purchasePrice: number | null;
};

const UNIT_DEFAULT = 'Stk.';

/** Heute als Datumseingabe, lokal, nicht UTC. */
export function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** PostgREST liefert `numeric` manchmal als String. Unlesbares wird `null`. */
export function finiteOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Zahl fürs Feld, deutsch, ohne Tausenderpunkt, damit der Parser sie wiedererkennt. */
export function decimalInput(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 4,
    useGrouping: false,
  }).format(value);
}

/**
 * Deutsche Eingabe („1.234,56" oder „12.5") als Zahl.
 *
 * Ein Komma macht den Punkt zum Tausendertrenner, sonst bleibt der Punkt
 * das Dezimalzeichen — dieselbe Regel wie im Belegeditor.
 */
export function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function emptyOrderMaterial(orderId: string): OrderMaterialDraft {
  return {
    orderId,
    mode: 'article',
    articleId: '',
    customTitle: '',
    quantity: '1',
    unit: UNIT_DEFAULT,
    unitCost: '',
    unitPrice: '',
    notes: '',
    usedAt: localToday(),
    billed: false,
  };
}

export function draftFromOrderMaterial(
  row: {
    id: string;
    articleId: string | null;
    customTitle: string;
    quantity: number;
    unit: string;
    unitCost: number | null;
    unitPrice: number | null;
    notes: string;
    usedAt: string;
    billed: boolean;
  },
  orderId: string,
): OrderMaterialDraft {
  return {
    id: row.id,
    orderId,
    mode: row.articleId ? 'article' : 'custom',
    articleId: row.articleId ?? '',
    customTitle: row.customTitle,
    quantity: decimalInput(row.quantity),
    unit: row.unit.trim() || UNIT_DEFAULT,
    unitCost: decimalInput(row.unitCost),
    unitPrice: decimalInput(row.unitPrice),
    notes: row.notes,
    usedAt: row.usedAt.slice(0, 10),
    billed: row.billed,
  };
}

/**
 * Katalogartikel ins Formular übernehmen.
 *
 * Verkaufspreis wird `unit_price`, auch wenn er leer ist — dann bleibt das
 * Feld leer und die Rechnung fällt auf den Einkaufspreis zurück. Einkaufspreis
 * und Einheit kommen mit, soweit der Artikel sie hat. Ein leerer Einkaufspreis
 * löscht einen vorher getippten Wert, damit nicht der Preis des vorigen
 * Artikels stehen bleibt.
 */
export function applyArticle(
  draft: OrderMaterialDraft,
  article: ArticleChoice,
): OrderMaterialDraft {
  return {
    ...draft,
    mode: 'article',
    articleId: article.id,
    customTitle: '',
    unit: article.unit.trim() || UNIT_DEFAULT,
    unitCost: decimalInput(article.purchasePrice),
    unitPrice: decimalInput(article.salePrice),
  };
}

export function orderMaterialIssue(draft: OrderMaterialDraft): OrderMaterialIssue | null {
  if (draft.mode === 'article') {
    if (!draft.articleId) return 'article';
  } else if (!draft.customTitle.trim()) {
    return 'title';
  }

  const quantity = parseDecimal(draft.quantity);
  if (quantity == null || quantity <= 0) return 'quantity';

  const cost = parseDecimal(draft.unitCost);
  if (cost == null || cost <= 0) return 'cost';

  if (draft.unitPrice.trim() && parseDecimal(draft.unitPrice) == null) return 'price';

  if (!isIsoDate(draft.usedAt.trim())) return 'date';
  return null;
}

/** Inhalt für Insert und Update. `null`, solange die Prüfung scheitert. */
export function materialWrite(draft: OrderMaterialDraft): MaterialWrite | null {
  if (orderMaterialIssue(draft)) return null;
  const quantity = parseDecimal(draft.quantity);
  const unitCost = parseDecimal(draft.unitCost);
  if (quantity == null || unitCost == null) return null;

  const priceText = draft.unitPrice.trim();
  const unitPrice = priceText ? parseDecimal(draft.unitPrice) : null;
  if (priceText && unitPrice == null) return null;

  const article = draft.mode === 'article';
  return {
    article_id: article ? draft.articleId : null,
    custom_title: article ? null : draft.customTitle.trim(),
    quantity,
    unit: draft.unit.trim() || UNIT_DEFAULT,
    unit_cost: unitCost,
    unit_price: unitPrice,
    notes: draft.notes.trim(),
    used_at: draft.usedAt.trim(),
  };
}

function sameNumber(left: number | null, right: number | null): boolean {
  if (left == null || right == null) return left == null && right == null;
  return Math.abs(left - right) < 1e-9;
}

/** Wahr, wenn ein Schreiben `modified_at` ohne sichtbare Änderung verschieben würde. */
export function materialUnchanged(
  existing: {
    article_id: string | null;
    custom_title: string | null;
    quantity: unknown;
    unit: string;
    unit_cost: unknown;
    unit_price: unknown;
    notes: string;
    used_at: string;
  },
  next: MaterialWrite,
): boolean {
  const title = (existing.custom_title ?? '').trim();
  const nextTitle = next.custom_title ?? '';
  return (
    (existing.article_id ?? null) === next.article_id &&
    title === nextTitle &&
    sameNumber(finiteOrNull(existing.quantity), next.quantity) &&
    existing.unit.trim() === next.unit &&
    sameNumber(finiteOrNull(existing.unit_cost), next.unit_cost) &&
    sameNumber(finiteOrNull(existing.unit_price), next.unit_price) &&
    existing.notes.trim() === next.notes &&
    existing.used_at.slice(0, 10) === next.used_at
  );
}
