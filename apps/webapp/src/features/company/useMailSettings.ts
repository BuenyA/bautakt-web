import type { Tables } from '@bautakt/supabase';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/**
 * Was die Oberfläche aus `company_mail_settings` liest (#220). Token und
 * Projekt-ID bleiben beim Mail-Adapter.
 */
export type MailSettings = Pick<
  Tables<'company_mail_settings'>,
  | 'reply_to_email'
  | 'mail_mode'
  | 'test_recipient_allowlist'
  | 'send_limit_per_hour'
  | 'send_limit_per_day'
>;

export type MailMode = 'dry_run' | 'allowlist' | 'live';

/**
 * Mail-Einstellungen des eigenen Betriebs; `null`, solange es für ihn keine
 * Zeile gibt. Ohne Zeile versendet der Adapter nicht.
 */
export function useMailSettings() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['company-mail-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<MailSettings | null> => {
      const { data, error } = await supabase
        .from('company_mail_settings')
        .select(
          'reply_to_email, mail_mode, test_recipient_allowlist, send_limit_per_hour, send_limit_per_day',
        )
        .eq('company_id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Wie `resolveSender` im Adapter: eigenes Reply-To, sonst die Firmen-Mail. */
export function effectiveReplyTo(
  settings: MailSettings | null | undefined,
  companyEmail: string | null | undefined,
): string {
  return (settings?.reply_to_email ?? companyEmail ?? '').trim();
}
