import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { type MailDeliveryRow, shouldPollDelivery, toDeliveryRows } from './mailDelivery';

export type MailDeliveryTarget =
  | { salesDocumentId: string }
  | { incomingInvoiceId: string }
  /** Angebote (bautakt-app#183): alle Versionen eines Vorgangs. */
  | { quoteVersionIds: string[] };

const POLL_INTERVAL_MS = 30_000;

/** Präfix zum Invalidieren nach einem Versand. */
export function mailDeliveryKey(companyId: string | undefined) {
  return ['mail-delivery', companyId] as const;
}

export type MailDeliveryData = {
  rows: MailDeliveryRow[];
  /** Empfänger je Mail aus dem Archiv. */
  recipients: Record<string, string[]>;
};

/**
 * Zustellstatus der Mails eines Belegs oder einer Eingangsrechnung. Der Webhook
 * schreibt die Rückmeldungen Sekunden bis Minuten nach dem Versand, deshalb wird
 * frisch nach dem Versand nachgeladen. Lesen darf, wer `mail_can_read` hat; die
 * View läuft mit den Rechten des Nutzers.
 */
export function useMailDeliveryStatus(target: MailDeliveryTarget) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: [...mailDeliveryKey(companyId), target],
    enabled: Boolean(companyId),
    refetchInterval: (query) =>
      query.state.data && shouldPollDelivery(query.state.data.rows, new Date().toISOString())
        ? POLL_INTERVAL_MS
        : false,
    queryFn: async (): Promise<MailDeliveryData> => {
      const base = supabase
        .from('mail_delivery_status')
        .select(
          'mail_id, sent_at, status, recipients_total, recipients_delivered, status_at, problem_recipient, problem_code, problem_message',
        )
        .eq('company_id', companyId!);
      // Die Sicht kennt keinen Angebotsbezug, deshalb erst die Mails der Versionen.
      let quoteMailIds: string[] = [];
      if ('quoteVersionIds' in target) {
        if (target.quoteVersionIds.length === 0) return { rows: [], recipients: {} };
        const { data: quoteMails, error: quoteMailsError } = await supabase
          .from('mail_messages')
          .select('id')
          .eq('company_id', companyId!)
          .in('quote_version_id', target.quoteVersionIds);
        if (quoteMailsError) throw quoteMailsError;
        quoteMailIds = quoteMails.map((mail) => mail.id);
        if (quoteMailIds.length === 0) return { rows: [], recipients: {} };
      }
      const { data, error } = await ('salesDocumentId' in target
        ? base.eq('sales_document_id', target.salesDocumentId)
        : 'incomingInvoiceId' in target
          ? base.eq('incoming_invoice_id', target.incomingInvoiceId)
          : base.in('mail_id', quoteMailIds));
      if (error) throw error;
      const rows = toDeliveryRows(data);
      if (rows.length === 0) return { rows, recipients: {} };

      const { data: mails, error: mailsError } = await supabase
        .from('mail_messages')
        .select('id, to_addresses')
        .eq('company_id', companyId!)
        .in(
          'id',
          rows.map((row) => row.mailId),
        );
      if (mailsError) throw mailsError;
      return {
        rows,
        recipients: Object.fromEntries(mails.map((mail) => [mail.id, mail.to_addresses])),
      };
    },
  });
}
