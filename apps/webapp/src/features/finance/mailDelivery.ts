/**
 * Versandnachweis einer archivierten Mail (bautakt-web#171), ohne React und
 * ohne Supabase, damit er mit `node --test` läuft.
 *
 * `mail-send` archiviert jede Mail vor dem Versand in `mail_messages` und
 * schreibt danach je Versuch ein Ereignis in `mail_message_events`: `sent`
 * mit der Message-ID des Mail-Dienstes, `failed` mit Fehlercode oder
 * `dry_run` im Probelauf. Beides ist unveränderbar. Ein Retry mit demselben
 * idempotencyKey hängt an dieselbe Mail ein weiteres Ereignis an.
 *
 * „Versendet“ heißt hier: vom Mail-Dienst angenommen. Ob die Mail ankam, steht
 * im Zustellstatus weiter unten (bautakt-web#276).
 */

/** Fehlercode von `mail-send`, wenn unklar ist, ob die Mail rausging. */
export const OUTCOME_UNKNOWN = 'provider_outcome_unknown';

/**
 * Ohne Ereignis ist eine Mail nur kurz: `mail-send` schreibt es im selben
 * Aufruf. Danach war der Aufruf abgebrochen, und ob die Mail rausging, ist
 * unklar.
 */
export const PENDING_GRACE_MS = 10 * 60 * 1000;

export type MailEventRow = {
  kind: string;
  provider_message_id: string | null;
  error_code: string | null;
  created_at: string;
};

export type MailDelivery =
  | { state: 'sent'; at: string; providerMessageId: string }
  | { state: 'dry_run'; at: string }
  | { state: 'failed'; at: string; errorCode: string }
  | { state: 'unknown'; at: string }
  | { state: 'pending' };

function byTime(a: MailEventRow, b: MailEventRow): number {
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/**
 * Stand einer Mail aus ihren Ereignissen. Ein `sent` gilt, auch wenn vorher
 * Versuche scheiterten; sonst zählt der jüngste Fehlversuch.
 */
export function mailDelivery(
  createdAt: string,
  events: readonly MailEventRow[],
  nowIso: string,
): MailDelivery {
  const sorted = [...events].sort(byTime);
  const sent = sorted.find((event) => event.kind === 'sent' && event.provider_message_id);
  if (sent) {
    return { state: 'sent', at: sent.created_at, providerMessageId: sent.provider_message_id! };
  }
  const dryRun = sorted.find((event) => event.kind === 'dry_run');
  if (dryRun) return { state: 'dry_run', at: dryRun.created_at };
  const failed = sorted.filter((event) => event.kind === 'failed').at(-1);
  if (failed) {
    return failed.error_code === OUTCOME_UNKNOWN
      ? { state: 'unknown', at: failed.created_at }
      : { state: 'failed', at: failed.created_at, errorCode: failed.error_code ?? 'unknown' };
  }
  if (Date.parse(nowIso) - Date.parse(createdAt) > PENDING_GRACE_MS) {
    return { state: 'unknown', at: createdAt };
  }
  return { state: 'pending' };
}

export type ArchivedMailStatus = {
  id: string;
  created_at: string;
  delivery: MailDelivery;
};

export type MailIssue =
  | { kind: 'failed' | 'unknown'; mailId: string }
  /** Ging raus, aber der Eintrag im Prüfprotokoll fehlt. */
  | { kind: 'unlogged'; mailId: string };

/**
 * Was im Prüfprotokoll noch offen ist. Ein Fehlversuch zählt nicht mehr,
 * sobald danach eine Mail zu derselben Rechnung rausging; eine versendete
 * Mail ohne `mail_sent`-Eintrag bleibt offen, bis er nachgetragen ist.
 */
export function openMailIssues(
  mails: readonly ArchivedMailStatus[],
  loggedMailIds: ReadonlySet<string>,
): MailIssue[] {
  const lastSentAt = mails
    .filter((mail) => mail.delivery.state === 'sent')
    .map((mail) => mail.created_at)
    .sort()
    .at(-1);
  const issues: MailIssue[] = [];
  for (const mail of [...mails].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) {
    const { state } = mail.delivery;
    if (state === 'sent') {
      if (!loggedMailIds.has(mail.id)) issues.push({ kind: 'unlogged', mailId: mail.id });
    } else if (
      (state === 'failed' || state === 'unknown') &&
      (lastSentAt === undefined || lastSentAt < mail.created_at)
    ) {
      issues.push({ kind: state, mailId: mail.id });
    }
  }
  return issues;
}

/**
 * Zustellstatus aus der View `mail_delivery_status` (bautakt-app#247), gespeist
 * vom Lettermint-Webhook. Jede tatsächlich versendete Mail hat eine Zeile.
 */
export type DeliveryStatus = 'sent' | 'deferred' | 'delivered' | 'undeliverable' | 'complained';

const DELIVERY_STATUSES: readonly string[] = [
  'sent',
  'deferred',
  'delivered',
  'undeliverable',
  'complained',
];

/** Spalten, wie sie die generierten Typen der View beschreiben (alle nullable). */
export type DeliveryStatusRaw = {
  mail_id: string | null;
  sent_at: string | null;
  status: string | null;
  recipients_total: number | null;
  recipients_delivered: number | null;
  status_at: string | null;
  problem_recipient: string | null;
  problem_code: string | null;
  problem_message: string | null;
};

export type MailDeliveryRow = {
  mailId: string;
  sentAt: string;
  status: DeliveryStatus;
  recipientsTotal: number;
  recipientsDelivered: number;
  /** Letzte Rückmeldung, sonst der Versand. */
  at: string;
  problemRecipient: string | null;
  /** SMTP-Code und Antwort des Empfängers, soweit bekannt. */
  problemReason: string | null;
};

/**
 * Zeilen der View, älteste zuerst. Ein unbekannter Status gilt als `sent`: Er
 * darf nie „zugestellt“ vortäuschen.
 */
export function toDeliveryRows(raw: readonly DeliveryStatusRaw[]): MailDeliveryRow[] {
  return raw
    .flatMap((row): MailDeliveryRow[] => {
      if (!row.mail_id || !row.sent_at) return [];
      const reason = [row.problem_code, row.problem_message].filter(Boolean).join(': ');
      return [
        {
          mailId: row.mail_id,
          sentAt: row.sent_at,
          status:
            row.status && DELIVERY_STATUSES.includes(row.status)
              ? (row.status as DeliveryStatus)
              : 'sent',
          recipientsTotal: row.recipients_total ?? 0,
          recipientsDelivered: row.recipients_delivered ?? 0,
          at: row.status_at ?? row.sent_at,
          problemRecipient: row.problem_recipient,
          problemReason: reason || null,
        },
      ];
    })
    .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
}

/**
 * Mails, die eine Warnung brauchen. Unzustellbar erledigt sich, sobald eine
 * spätere Mail zugestellt wurde (auch an eine korrigierte Adresse). Eine
 * Spam-Beschwerde bleibt: Sie lässt sich durch erneutes Senden nicht beheben.
 */
export function openDeliveryProblems(rows: readonly MailDeliveryRow[]): MailDeliveryRow[] {
  const lastDelivered = Math.max(
    ...rows.filter((row) => row.status === 'delivered').map((row) => Date.parse(row.sentAt)),
    Number.NEGATIVE_INFINITY,
  );
  return rows.filter(
    (row) =>
      row.status === 'complained' ||
      (row.status === 'undeliverable' && Date.parse(row.sentAt) > lastDelivered),
  );
}

/** So lange nach dem Versand kommen Rückmeldungen typischerweise an. */
export const DELIVERY_POLL_WINDOW_MS = 15 * 60 * 1000;

/** Offene Zeilen frisch nach dem Versand nachladen, ältere nicht mehr. */
export function shouldPollDelivery(rows: readonly MailDeliveryRow[], nowIso: string): boolean {
  const now = Date.parse(nowIso);
  return rows.some(
    (row) =>
      (row.status === 'sent' || row.status === 'deferred') &&
      now - Date.parse(row.sentAt) < DELIVERY_POLL_WINDOW_MS,
  );
}
