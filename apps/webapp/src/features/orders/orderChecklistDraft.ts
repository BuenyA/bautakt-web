/**
 * Formularzustand und die reine Änderung an einer Auftrags-Checkliste.
 *
 * Die Tabelle lässt einen leeren Titel zu (`title` default `''`). Die
 * Oberfläche nicht: ein Punkt ohne Text ist in der Liste nicht zu erkennen.
 * Das Datum ist `date`, nicht `timestamptz` — leer heißt NULL, und ein
 * ungültiger Kalendertag scheitert in Postgres genauso.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert (Fast Refresh).
 */

export type OrderChecklistParent = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  modifiedAt: string | null;
};

export type OrderChecklistItem = {
  id: string;
  title: string;
  isDone: boolean;
  position: number;
  /** `YYYY-MM-DD` oder null. */
  dueDate: string | null;
  assignedEmploymentId: string | null;
  doneAt: string | null;
  createdAt: string;
  modifiedAt: string | null;
  assignee: string;
  assigneeEnded: boolean;
};

export type OrderChecklistSnapshot = {
  checklist: OrderChecklistParent | null;
  items: OrderChecklistItem[];
};

export type ChecklistItemDraft = {
  orderId: string;
  id?: string;
  title: string;
  /** Rohtext der Datumseingabe, `YYYY-MM-DD` oder leer. */
  dueDate: string;
  /** Beschäftigungs-Id oder leer. */
  assignedEmploymentId: string;
  assigneeName: string;
};

/** Wert der Auswahl „Niemand“. Radix Select nimmt keinen leeren String. */
export const CHECKLIST_UNASSIGNED = 'none';

export type ChecklistFieldIssue = 'title' | 'date' | 'assignee';

export type ChecklistFields = {
  title: string;
  dueDate: string | null;
  assignedEmploymentId: string | null;
};

/**
 * Änderung, die als ganze Liste geschrieben wird.
 *
 * `create` trägt die clientseitige Id schon mit. Kommt dieselbe Id noch
 * einmal an, wird sie zum Update — ein zweiter Klick legt keinen zweiten
 * Punkt an.
 */
export type ChecklistChange =
  | ({ kind: 'create'; orderId: string; id: string } & ChecklistFields)
  | ({ kind: 'update'; orderId: string; id: string } & ChecklistFields)
  | { kind: 'toggle'; orderId: string; id: string; isDone: boolean }
  | { kind: 'delete'; orderId: string; id: string };

export type ApplyChecklistResult =
  | { ok: true; changed: false }
  | { ok: true; changed: true; items: OrderChecklistItem[] }
  | { ok: false; reason: 'missing' | ChecklistFieldIssue };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Heute als Datumseingabe, lokal, nicht UTC. */
export function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Kalendertag, den Postgres als `date` annimmt. `2026-02-31` ist keiner. */
export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function emptyChecklistItem(orderId: string): ChecklistItemDraft {
  return {
    orderId,
    title: '',
    dueDate: '',
    assignedEmploymentId: '',
    assigneeName: '',
  };
}

export function draftFromChecklistItem(
  item: OrderChecklistItem,
  orderId: string,
): ChecklistItemDraft {
  return {
    orderId,
    id: item.id,
    title: item.title.trim(),
    dueDate: item.dueDate ?? '',
    assignedEmploymentId: item.assignedEmploymentId ?? '',
    assigneeName: item.assignee,
  };
}

export function readChecklistFields(input: {
  title: string;
  dueDate: string;
  assignedEmploymentId: string;
}): { ok: true; fields: ChecklistFields } | { ok: false; issue: ChecklistFieldIssue } {
  const title = input.title.trim();
  if (!title) return { ok: false, issue: 'title' };

  const dueRaw = input.dueDate.trim();
  if (dueRaw && !isCalendarDate(dueRaw)) return { ok: false, issue: 'date' };

  const assigneeRaw = input.assignedEmploymentId.trim();
  if (assigneeRaw && !UUID_PATTERN.test(assigneeRaw)) return { ok: false, issue: 'assignee' };

  return {
    ok: true,
    fields: {
      title,
      dueDate: dueRaw || null,
      assignedEmploymentId: assigneeRaw || null,
    },
  };
}

function nextPosition(items: readonly OrderChecklistItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.position), -1) + 1;
}

function sameText(item: OrderChecklistItem, fields: ChecklistFields): boolean {
  return (
    item.title.trim() === fields.title &&
    item.dueDate === fields.dueDate &&
    item.assignedEmploymentId === fields.assignedEmploymentId
  );
}

function replaceItem(
  items: readonly OrderChecklistItem[],
  id: string,
  next: OrderChecklistItem,
): OrderChecklistItem[] {
  return items.map((item) => (item.id === id ? next : item));
}

/**
 * Eine Änderung auf die geladene Liste anwenden.
 *
 * Bestehende Positionen bleiben. Ein neuer Punkt hängt hinten an
 * (`max(position) + 1`). Löschen nummeriert nicht neu, sonst wanderte
 * `modified_at` an Zeilen, die sich nicht geändert haben. Abhaken setzt
 * `done_at`, Aufheben löscht es. Titel, Datum und Zuweisung lassen `is_done`
 * und `done_at` stehen.
 */
export function applyChecklistChange(
  items: readonly OrderChecklistItem[],
  change: ChecklistChange,
  now: string,
): ApplyChecklistResult {
  if (change.kind === 'delete') {
    if (!items.some((item) => item.id === change.id)) return { ok: true, changed: false };
    return { ok: true, changed: true, items: items.filter((item) => item.id !== change.id) };
  }

  if (change.kind === 'toggle') {
    const current = items.find((item) => item.id === change.id);
    if (!current) return { ok: false, reason: 'missing' };
    if (current.isDone === change.isDone) return { ok: true, changed: false };
    const next: OrderChecklistItem = {
      ...current,
      isDone: change.isDone,
      doneAt: change.isDone ? now : null,
      modifiedAt: now,
    };
    return { ok: true, changed: true, items: replaceItem(items, change.id, next) };
  }

  const fields: ChecklistFields = {
    title: change.title,
    dueDate: change.dueDate,
    assignedEmploymentId: change.assignedEmploymentId,
  };
  const checked = readChecklistFields({
    title: fields.title,
    dueDate: fields.dueDate ?? '',
    assignedEmploymentId: fields.assignedEmploymentId ?? '',
  });
  if (!checked.ok) return { ok: false, reason: checked.issue };

  const current = items.find((item) => item.id === change.id);
  if (!current) {
    if (change.kind === 'update') return { ok: false, reason: 'missing' };
    const created: OrderChecklistItem = {
      id: change.id,
      title: checked.fields.title,
      isDone: false,
      position: nextPosition(items),
      dueDate: checked.fields.dueDate,
      assignedEmploymentId: checked.fields.assignedEmploymentId,
      doneAt: null,
      createdAt: now,
      modifiedAt: now,
      assignee: '',
      assigneeEnded: false,
    };
    return { ok: true, changed: true, items: [...items, created] };
  }

  if (sameText(current, checked.fields)) return { ok: true, changed: false };
  const next: OrderChecklistItem = {
    ...current,
    title: checked.fields.title,
    dueDate: checked.fields.dueDate,
    assignedEmploymentId: checked.fields.assignedEmploymentId,
    modifiedAt: now,
  };
  return { ok: true, changed: true, items: replaceItem(items, change.id, next) };
}
