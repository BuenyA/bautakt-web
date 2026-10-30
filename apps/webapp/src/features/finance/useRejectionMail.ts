import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  type MailTemplate,
  originalKind,
  REJECTION_PURPOSE,
  sellerEmailFromParse,
  suggestedRecipient,
} from './rejectionMail';
import { downloadIncomingOriginal } from './useIncomingInvoice';

/** Fehlercodes von `finance-inbound-reject-send` bzw. `mail-send` (#149). */
const SEND_ERRORS = new Set([
  'recipient_not_allowed',
  'legal_footer_incomplete',
  'send_limit_exceeded',
  'mail_not_configured',
  'provider_failed',
  'provider_outcome_unknown',
  'send_in_progress',
  'idempotency_conflict',
  'invalid_request',
  'forbidden',
  'not_rejected',
]);

export class RejectionSendError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export type RejectionBody = { to: string[]; subject: string; text: string };

/** Antwort von `mail-send` auf `preview: true`, durchgereicht von der Function. */
export type RejectionPreview = {
  html: string;
  mode: string;
  from: string;
  replyTo: string | null;
  missingLegalFields: string[];
};

/** Antwort beim Versand; `bookkeeping`: Protokolleintrag danach. */
export type RejectionSendResult = {
  mailId: string;
  mode: string;
  bookkeeping?: 'done' | 'failed';
};

async function invokeRejectSend<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('finance-inbound-reject-send', { body });
  if (!error) return data as T;
  // FunctionsHttpError trägt die Antwort der Function in `context`.
  const response: unknown = (error as { context?: unknown }).context;
  if (response instanceof Response) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (payload?.error && SEND_ERRORS.has(payload.error)) {
      throw new RejectionSendError(payload.error);
    }
  }
  throw new RejectionSendError('unknown');
}

/**
 * Eigene Vorlage des Betriebs; `null`, solange er die eingebaute nutzt.
 * Lesen darf jedes Mitglied (RLS).
 */
export function useRejectionTemplate() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['mail-template', companyId, REJECTION_PURPOSE],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<MailTemplate | null> => {
      const { data, error } = await supabase
        .from('company_mail_templates')
        .select('subject, body')
        .eq('company_id', companyId!)
        .eq('purpose', REJECTION_PURPOSE)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Vorlage speichern (`template`) oder auf die eingebaute zurücksetzen
 * (`null` = Zeile löschen).
 *
 * Kein Upsert: PostgREST setzt dabei im Konfliktfall alle Spalten, das
 * UPDATE-Recht gilt aber nur für Betreff und Text. Deshalb erst ändern und,
 * wenn es noch keine Zeile gibt, anlegen. 0 Zeilen nach dem Anlegen ist ein
 * Fehler. Beim Zurücksetzen heißen 0 gelöschte Zeilen nur dann Erfolg, wenn
 * danach wirklich keine eigene Vorlage mehr da ist (RLS meldet keinen Fehler).
 */
export function useSaveRejectionTemplate() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useMutation({
    mutationFn: async (template: MailTemplate | null) => {
      const table = () => supabase.from('company_mail_templates');
      if (template === null) {
        const { data, error } = await table()
          .delete()
          .eq('company_id', companyId!)
          .eq('purpose', REJECTION_PURPOSE)
          .select('company_id');
        if (error) throw error;
        if (data.length > 0) return;
        const { data: still, error: stillError } = await table()
          .select('company_id')
          .eq('company_id', companyId!)
          .eq('purpose', REJECTION_PURPOSE)
          .maybeSingle();
        if (stillError) throw stillError;
        if (still) throw new Error('MAIL_TEMPLATE_NOT_SAVED');
        return;
      }
      const values = { subject: template.subject.trim(), body: template.body.trim() };
      const { data: updated, error: updateError } = await table()
        .update(values)
        .eq('company_id', companyId!)
        .eq('purpose', REJECTION_PURPOSE)
        .select('company_id');
      if (updateError) throw updateError;
      if (updated.length === 1) return;
      const { data: inserted, error: insertError } = await table()
        .insert({ company_id: companyId!, purpose: REJECTION_PURPOSE, ...values })
        .select('company_id');
      if (insertError) throw insertError;
      if (inserted.length !== 1) throw new Error('MAIL_TEMPLATE_NOT_SAVED');
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['mail-template', companyId, REJECTION_PURPOSE],
      }),
  });
}

/**
 * Vorschlag für den Empfänger: die Lieferanten-Mail (BT-43) aus dem
 * abgelegten Original, sonst die Mail des Lieferanten-Kontakts. BT-43 wird
 * nicht gespeichert; das Original ist unverändert, also liest
 * `finance-inbound-parse` dieselbe Adresse wie beim Erfassen.
 *
 * Scheitert das Lesen des Originals, bleibt es beim Kontakt: Der Empfänger
 * steht ohnehin zur Prüfung im Formular.
 */
export function useRejectionRecipient(invoice: {
  id: string;
  supplier_id: string | null;
  storage_path: string | null;
  source_format: string;
}) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['rejection-recipient', companyId, invoice.id],
    enabled: Boolean(companyId),
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const [eInvoiceEmail, contactEmail] = await Promise.all([
        eInvoiceSellerEmail(invoice),
        supplierContactEmail(companyId!, invoice.supplier_id),
      ]);
      return suggestedRecipient(eInvoiceEmail, contactEmail);
    },
  });
}

async function eInvoiceSellerEmail(invoice: {
  storage_path: string | null;
  source_format: string;
}): Promise<string | null> {
  if (!invoice.storage_path || invoice.source_format === 'manual') return null;
  const kind = originalKind(invoice.storage_path);
  if (!kind) return null;
  try {
    const bytes = await downloadIncomingOriginal(invoice.storage_path);
    const body =
      kind === 'xml'
        ? { xmlText: new TextDecoder().decode(bytes) }
        : { pdfBase64: toBase64(bytes) };
    const { data, error } = await supabase.functions.invoke('finance-inbound-parse', { body });
    if (error) throw error;
    return sellerEmailFromParse(data);
  } catch (error) {
    console.error('Ablehnungs-Mail: Lieferanten-Mail aus der E-Rechnung nicht lesbar', error);
    return null;
  }
}

async function supplierContactEmail(
  companyId: string,
  supplierId: string | null,
): Promise<string | null> {
  if (!supplierId) return null;
  const { data, error } = await supabase
    .from('contacts')
    .select('email')
    .eq('company_id', companyId)
    .eq('id', supplierId)
    .maybeSingle();
  if (error) throw error;
  return data?.email ?? null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  // In Stücken, sonst sprengt `String.fromCharCode` bei großen PDFs den Stack.
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

/**
 * Vorschau vom Server: genau die Mail, die `mail-send` verschicken würde,
 * mit Absender, Reply-To und Fußzeile. Nichts wird archiviert oder versendet.
 */
export function useRejectionPreview(invoiceId: string, body: RejectionBody, enabled: boolean) {
  return useQuery({
    queryKey: ['rejection-mail-preview', invoiceId, body],
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: () => invokeRejectSend<RejectionPreview>({ invoiceId, ...body, preview: true }),
  });
}

/**
 * Versand über `finance-inbound-reject-send`. `idempotencyKey` je
 * Bestätigung: Ein Retry versendet nicht doppelt und holt einen fehlenden
 * Protokolleintrag nach.
 */
export function useSendRejectionMail(invoiceId: string) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useMutation({
    mutationFn: (body: RejectionBody & { idempotencyKey: string }) =>
      invokeRejectSend<RejectionSendResult>({ invoiceId, ...body }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['incoming-invoice-events', companyId, invoiceId],
        }),
        queryClient.invalidateQueries({ queryKey: ['rejection-mails', companyId, invoiceId] }),
      ]),
  });
}

export type ArchivedMail = {
  id: string;
  to_addresses: string[];
  subject: string;
  html: string;
  created_at: string;
};

/**
 * Archivierte Ablehnungs-Mails der Rechnung (`mail_messages`, unveränderbar),
 * für Empfänger, Betreff und Text im Protokoll. Lesen darf, wer Gemeinkosten
 * verwaltet oder die Finanzen sieht (`mail_can_read`).
 */
export function useRejectionMails(invoiceId: string, enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['rejection-mails', companyId, invoiceId],
    enabled: Boolean(companyId) && enabled,
    queryFn: async (): Promise<ArchivedMail[]> => {
      const { data, error } = await supabase
        .from('mail_messages')
        .select('id, to_addresses, subject, html, created_at')
        .eq('company_id', companyId!)
        .eq('incoming_invoice_id', invoiceId)
        .eq('purpose', REJECTION_PURPOSE);
      if (error) throw error;
      return data;
    },
  });
}
