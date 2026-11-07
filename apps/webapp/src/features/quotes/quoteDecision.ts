/**
 * Regeln der Angebotsentscheidung (bautakt-app#186), ohne React und ohne
 * Supabase, damit sie sich mit `node --test` prüfen lassen.
 *
 * Verbindlich prüft die Datenbank (`accept_quote` und Co.). Diese Funktionen
 * führen nur die Oberfläche, damit der Fehler gar nicht erst entsteht.
 */

export type DecisionKind = 'signature' | 'paper' | 'mail' | 'verbal';

/** Annahme kennt alle vier Arten, Ablehnung keine Unterschrift am Gerät. */
export const ACCEPT_KINDS: readonly DecisionKind[] = ['signature', 'paper', 'mail', 'verbal'];
export const DECLINE_KINDS: readonly DecisionKind[] = ['paper', 'mail', 'verbal'];

/** Unterschrift und Papier brauchen eine Datei als Nachweis. */
export function needsEvidence(kind: DecisionKind): boolean {
  return kind === 'signature' || kind === 'paper';
}

/**
 * Verbraucher im Sinne der Sperre: Kontakt der Art Person ohne USt-IdNr.
 * Dieselbe Regel wie in `accept_quote`.
 */
export function isConsumer(contact: { kind: string; vat_id?: string | null } | null | undefined) {
  return contact?.kind === 'person' && (contact.vat_id ?? '').trim() === '';
}

export type SelectableItem = {
  id: string;
  node_type: string;
  position_type: string | null;
  alternative_to_id: string | null;
};

/** Wählbar sind nur Alternativ- und Bedarfspositionen. */
export function selectableItems<T extends SelectableItem>(items: readonly T[]): T[] {
  return items.filter(
    (item) =>
      item.node_type === 'position' &&
      (item.position_type === 'alternative' || item.position_type === 'contingency'),
  );
}

/**
 * Auswahl umschalten. Wer eine Alternative wählt, wählt die anderen
 * Alternativen zur selben Grundposition ab: je Position gilt höchstens eine.
 */
export function toggleSelection(
  items: readonly SelectableItem[],
  selected: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
    return next;
  }
  const item = items.find((candidate) => candidate.id === id);
  if (item?.position_type === 'alternative' && item.alternative_to_id) {
    for (const other of items) {
      if (
        other.id !== id &&
        other.position_type === 'alternative' &&
        other.alternative_to_id === item.alternative_to_id
      ) {
        next.delete(other.id);
      }
    }
  }
  next.add(id);
  return next;
}

/** Datum und Uhrzeit für die Felder, in der Ortszeit des Browsers. */
export function localDateTimeParts(now: Date): { date: string; time: string } {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/** Feldwerte (`YYYY-MM-DD`, `HH:MM`, Ortszeit) als ISO-Zeitpunkt; ungültig: `null`. */
export function decidedAtIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

/** Liegt der Zeitpunkt mehr als zehn Minuten in der Zukunft? Wie die Datenbank. */
export function isInFuture(iso: string, now: Date): boolean {
  return new Date(iso).getTime() > now.getTime() + 10 * 60 * 1000;
}

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

export const EVIDENCE_TYPES = Object.keys(EXTENSIONS);

/** Ablage des Nachweises: `{company}/{quote}/acceptance/{id}.{ext}`; unbekannter Typ: `null`. */
export function evidencePath(
  companyId: string,
  quoteId: string,
  fileId: string,
  mimeType: string,
): string | null {
  const extension = EXTENSIONS[mimeType];
  return extension ? `${companyId}/${quoteId}/acceptance/${fileId}.${extension}` : null;
}

/**
 * Nachweise der geltenden Entscheidung. `accept_quote` legt den Nachweis in
 * derselben Transaktion an, in der es `decision_recorded_at` setzt; beide
 * tragen daher denselben Zeitpunkt. Nachweise einer zurückgenommenen Annahme
 * bleiben gespeichert, gehören aber nicht zur geltenden Entscheidung.
 */
export function currentEvidence<T extends { created_at: string }>(
  rows: readonly T[],
  recordedAt: string | null,
): T[] {
  if (!recordedAt) return [];
  const at = new Date(recordedAt).getTime();
  return rows.filter((row) => new Date(row.created_at).getTime() === at);
}

export type OrderMode = 'new' | 'existing' | 'none';

/** Vorgabe bei der Annahme: neuer Auftrag, wenn das Recht dafür da ist. */
export function defaultOrderMode(canCreateOrders: boolean): OrderMode {
  return canCreateOrders ? 'new' : 'none';
}

/**
 * Aufträge, an die sich ein Angebot hängen lässt: nicht abgeschlossen und vom
 * selben Kunden, wenn beide einen haben. Wie `accept_quote`; ob der Auftrag
 * schon ein angenommenes Hauptangebot hat, prüft nur die Datenbank.
 */
export function linkableOrders<T extends { status: string; customer_id: string | null }>(
  orders: readonly T[],
  customerId: string | null,
): T[] {
  return orders.filter(
    (order) =>
      order.status !== 'finished' &&
      (!customerId || !order.customer_id || order.customer_id === customerId),
  );
}

/** Schlüssel des Verlaufs je Ereignis; Probelauf heißt anders als echter Versand. */
export function quoteEventKey(event: { event_type: string; payload: unknown }): string {
  const mode = (event.payload as { mode?: unknown } | null)?.mode;
  return event.event_type === 'sent' && mode === 'dry_run' ? 'sentDryRun' : event.event_type;
}

/**
 * Zusatz im Verlauf: Begründung der Zurücknahme, Grund der Ablehnung oder die
 * Nummer der Auftragsbestätigung (erstellt oder versendet, bautakt-app#187).
 */
export function quoteEventDetail(event: { event_type: string; payload: unknown }): string {
  const payload = (event.payload ?? {}) as {
    reason?: unknown;
    document_number?: unknown;
    confirmation_number?: unknown;
  };
  if (event.event_type === 'decision_reverted' || event.event_type === 'declined') {
    return typeof payload.reason === 'string' ? payload.reason : '';
  }
  if (event.event_type === 'confirmation_created') {
    return typeof payload.document_number === 'string' ? payload.document_number : '';
  }
  if (event.event_type === 'sent') {
    return typeof payload.confirmation_number === 'string' ? payload.confirmation_number : '';
  }
  return '';
}

/**
 * Auftragsbestätigung der laufenden Annahme (bautakt-app#187). Je Annahme gibt
 * es höchstens eine; sie gehört zur angenommenen Version und ist nach der
 * Erfassung der Annahme entstanden. Ältere stammen aus einer zurückgenommenen
 * Annahme und bleiben nur zur Ansicht.
 */
export function currentConfirmation<
  T extends { version_id: string; created_at: string; content_hash: string | null },
>(
  rows: readonly T[],
  quote: {
    decision: string | null;
    accepted_version_id: string | null;
    decision_recorded_at: string | null;
  },
): T | null {
  if (quote.decision !== 'accepted' || !quote.accepted_version_id || !quote.decision_recorded_at) {
    return null;
  }
  const since = new Date(quote.decision_recorded_at).getTime();
  return (
    rows.find(
      (row) =>
        row.version_id === quote.accepted_version_id && new Date(row.created_at).getTime() >= since,
    ) ?? null
  );
}
