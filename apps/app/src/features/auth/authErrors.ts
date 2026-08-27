import type { AuthError } from '@supabase/supabase-js';

/**
 * Supabase-Fehler auf i18n-Keys abbilden.
 *
 * Bewusst ueber `code` statt ueber die englische `message`: die Meldungstexte
 * sind nicht Teil der API-Zusage und aendern sich zwischen Versionen.
 */
export function authErrorKey(error: AuthError | null): string | null {
  if (!error) return null;

  switch (error.code) {
    case 'invalid_credentials':
      return 'errors:auth.invalidCredentials';
    case 'email_not_confirmed':
      return 'errors:auth.emailNotConfirmed';
    case 'user_already_exists':
    case 'email_exists':
      return 'errors:auth.userAlreadyExists';
    case 'weak_password':
      return 'errors:auth.weakPassword';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'errors:auth.rateLimited';
    default:
      return 'errors:generic';
  }
}
