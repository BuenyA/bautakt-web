/**
 * Ablehnungs-Mail an den Absender einer Eingangsrechnung (bautakt-web#165),
 * ohne React und ohne Supabase, damit sie mit `node --test` läuft.
 *
 * Die Vorlage je Betrieb steht in `company_mail_templates` (bautakt-app
 * 20261029170000_b_incoming_rejection_mail); fehlt die Zeile, gilt die
 * eingebaute aus `domain:rejectionMail.template`. Platzhalter in einfachen
 * geschweiften Klammern füllt die Oberfläche, bevor der Nutzer den fertigen
 * Text sieht und ändert. Versendet wird über `finance-inbound-reject-send`.
 */

import { parseRecipients } from './sendMail.ts';

export const REJECTION_PURPOSE = 'incoming_invoice_rejection';

export const REJECTION_PLACEHOLDERS = [
  'rechnungsnummer',
  'rechnungsdatum',
  'betrag',
  'lieferant',
  'grund',
  'firma',
] as const;

export type RejectionPlaceholder = (typeof REJECTION_PLACEHOLDERS)[number];

export type RejectionValues = Record<RejectionPlaceholder, string>;

export type MailTemplate = { subject: string; body: string };

/** Dieselben Grenzen wie die CHECKs von `company_mail_templates`. */
export const MAX_TEMPLATE_SUBJECT = 998;
export const MAX_TEMPLATE_BODY = 20000;

const PLACEHOLDER = /\{([a-zäöüß]+)\}/gi;

function isPlaceholder(name: string): name is RejectionPlaceholder {
  return (REJECTION_PLACEHOLDERS as readonly string[]).includes(name);
}

/**
 * `{rechnungsnummer}` usw. durch die Werte ersetzen. Unbekannte Namen bleiben
 * stehen, damit der Nutzer sie in der Vorschau sieht. Im Betreff werden
 * Zeilenumbrüche aus den Werten (etwa aus dem Grund) zu Leerzeichen.
 */
export function fillTemplate(template: MailTemplate, values: RejectionValues): MailTemplate {
  const fill = (text: string, oneLine: boolean) =>
    text.replace(PLACEHOLDER, (match, name: string) => {
      const key = name.toLowerCase();
      if (!isPlaceholder(key)) return match;
      return oneLine ? values[key].replace(/\s*[\r\n]+\s*/g, ' ') : values[key];
    });
  return { subject: fill(template.subject, true), body: fill(template.body, false) };
}

/** Platzhalter, die es nicht gibt (Tippfehler wie `{rechnungsnr}`). */
export function unknownPlaceholders(template: MailTemplate): string[] {
  const names = [...`${template.subject}\n${template.body}`.matchAll(PLACEHOLDER)].flatMap(
    (match) => (isPlaceholder(match[1].toLowerCase()) ? [] : [match[0]]),
  );
  return [...new Set(names)];
}

export type TemplateError =
  'subjectRequired' | 'subjectTooLong' | 'subjectLineBreak' | 'bodyRequired' | 'bodyTooLong';

/** Wie die CHECKs der Tabelle, damit der Fehler am Feld steht, nicht als Datenbankmeldung. */
export function templateErrors(template: MailTemplate): {
  subject: TemplateError | null;
  body: TemplateError | null;
} {
  const { subject, body } = template;
  return {
    subject:
      subject.trim() === ''
        ? 'subjectRequired'
        : /[\r\n]/.test(subject)
          ? 'subjectLineBreak'
          : subject.length > MAX_TEMPLATE_SUBJECT
            ? 'subjectTooLong'
            : null,
    body:
      body.trim() === '' ? 'bodyRequired' : body.length > MAX_TEMPLATE_BODY ? 'bodyTooLong' : null,
  };
}

/** Gleich der eingebauten Vorlage heißt: keine eigene Zeile nötig. */
export function isSameTemplate(a: MailTemplate, b: MailTemplate): boolean {
  return a.subject.trim() === b.subject.trim() && a.body.trim() === b.body.trim();
}

/**
 * Lieferanten-Mail (BT-43) aus der Antwort von `finance-inbound-parse`. Nur
 * eine gültige Adresse zählt; sonst `null`.
 */
export function sellerEmailFromParse(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const seller = (body as { seller?: unknown }).seller;
  if (typeof seller !== 'object' || seller === null) return null;
  const email = (seller as { email?: unknown }).email;
  if (typeof email !== 'string') return null;
  const { valid, invalid } = parseRecipients(email);
  return valid.length === 1 && invalid.length === 0 ? valid[0] : null;
}

/** Erst die Angabe der E-Rechnung, dann die Mail des Lieferanten-Kontakts. */
export function suggestedRecipient(
  eInvoiceEmail: string | null,
  contactEmail: string | null,
): { address: string; source: 'eInvoice' | 'contact' | null } {
  if (eInvoiceEmail) return { address: eInvoiceEmail, source: 'eInvoice' };
  const contact = parseRecipients(contactEmail ?? '');
  if (contact.valid.length === 1 && contact.invalid.length === 0) {
    return { address: contact.valid[0], source: 'contact' };
  }
  return { address: '', source: null };
}

/** Begründung der Ablehnung: der jüngste Eintrag `rejected` im Protokoll. */
export function rejectionReason(
  events: readonly { action: string; reason: string; created_at: string }[],
): string {
  const rejected = events
    .filter((event) => event.action === 'rejected')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rejected[0]?.reason.trim() ?? '';
}

/** Art der Originaldatei für `finance-inbound-parse`; Fotos haben kein XML. */
export function originalKind(storagePath: string): 'pdf' | 'xml' | null {
  const ext = storagePath.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xml') return 'xml';
  return null;
}
