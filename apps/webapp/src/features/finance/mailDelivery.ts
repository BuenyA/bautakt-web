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
 * Zustellstatus (delivered, bounced) liefert Lettermint ohne Webhook nicht;
 * „versendet“ heißt hier: vom Mail-Dienst angenommen.
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
