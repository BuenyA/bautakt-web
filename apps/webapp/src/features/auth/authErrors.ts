import type { AuthError } from '@supabase/supabase-js';

/**
 * Fester GoTrue-Text, wenn die oeffentliche Registrierung aus ist.
 * `NewUnprocessableEntityError` liefert HTTP 422; aeltere Instanzen 400.
 */
const SIGNUPS_DISABLED_MESSAGE = 'Signups not allowed for this instance';

/**
 * Supabase-Fehler auf i18n-Keys abbilden.
 *
 * Bewusst ueber `code` statt ueber die englische `message`: die Meldungstexte
 * sind nicht Teil der API-Zusage und aendern sich zwischen Versionen.
 *
 * Ausnahme `signup_disabled`: der Code ist die Zusage. Fehlt er, zaehlt nur
 * der feste Satz oben — und nur, wenn kein anderer Code gesetzt ist, damit
 * ein bekannter Fehler nicht umgedeutet wird.
 */
function isSignupDisabled(error: AuthError): boolean {
  if (error.code === 'signup_disabled') return true;
  if (error.code) return false;
  return error.message.trim() === SIGNUPS_DISABLED_MESSAGE;
}

export function authErrorKey(error: AuthError | null): string | null {
  if (!error) return null;
  if (isSignupDisabled(error)) return 'errors:auth.signupDisabled';

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
