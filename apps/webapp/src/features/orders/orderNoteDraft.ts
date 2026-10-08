/**
 * Formularzustand einer Auftragsnotiz.
 *
 * Titel und Text sind die einzigen Inhaltsspalten von `order_notes`. Eines
 * von beiden muss nach dem Trim Inhalt haben — so steht es in der Handy-App
 * und in den Akzeptanzkriterien. Die Spalten selbst nähmen den leeren Text
 * an; eine Notiz aus nur Leerzeichen wäre in der Liste unsichtbar, weil die
 * Anzeige trimmt.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert (Fast Refresh).
 */
export type OrderNoteDraft = {
  id?: string;
  orderId: string;
  title: string;
  body: string;
};

export type OrderNoteIssue = 'empty';

export function emptyOrderNote(orderId: string): OrderNoteDraft {
  return { orderId, title: '', body: '' };
}

export function draftFromOrderNote(
  note: { id: string; title: string; body: string },
  orderId: string,
): OrderNoteDraft {
  return {
    id: note.id,
    orderId,
    title: note.title,
    body: note.body,
  };
}

export function orderNoteIssue(draft: OrderNoteDraft): OrderNoteIssue | null {
  if (!draft.title.trim() && !draft.body.trim()) return 'empty';
  return null;
}
