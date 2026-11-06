import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { terminationErrorKey } from './termination';

/** Fehler mit Übersetzungsschlüssel, die Seite zeigt ihn an. */
export class TerminationError extends Error {
  readonly key: string;
  constructor(key: string) {
    super(key);
    this.key = key;
  }
}

/**
 * Kündigung beantragen und widerrufen (Löschkonzept WP6). Danach den Status neu laden,
 * Banner und Seite hängen an `my_company_lifecycle`.
 */
export function useCompanyTermination() {
  const { user, signIn } = useAuth();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['company-lifecycle', user?.id] });

  const request = useMutation({
    mutationFn: async ({
      password,
      exportConfirmed,
    }: {
      password: string;
      exportConfirmed: boolean;
    }) => {
      if (!companyId || !user?.email)
        throw new TerminationError('companySettings:delete.errors.unknown');
      // Neue Anmeldung mit Passwort: Die Datenbank prüft am Token, dass sie frisch ist
      // (Claim `amr`), das Passwort selbst geht nie an die RPC.
      const { error: authError } = await signIn(user.email, password);
      if (authError) throw new TerminationError('companySettings:delete.errors.password');
      const { error } = await supabase.rpc('request_company_termination', {
        p_company_id: companyId,
        p_export_notice_confirmed: exportConfirmed,
      });
      if (error) throw new TerminationError(terminationErrorKey(error.message));
    },
    onSettled: refresh,
  });

  const revoke = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new TerminationError('companySettings:delete.errors.unknown');
      const { error } = await supabase.rpc('revoke_company_termination', {
        p_company_id: companyId,
      });
      if (error) throw new TerminationError(terminationErrorKey(error.message));
    },
    onSettled: refresh,
  });

  return { request, revoke };
}
