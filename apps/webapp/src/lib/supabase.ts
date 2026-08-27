import { createBautaktClient } from '@bautakt/supabase';

/**
 * Der Supabase-Client dieser App.
 *
 * ⚠️ Vite ersetzt `import.meta.env.VITE_*` zur BUILD-Zeit durch den Wert. Eine
 * Aenderung in den Vercel-Projekteinstellungen wirkt deshalb erst nach einem
 * Redeploy, nicht nach einem Neustart. Das ist ein haeufiger Stolperstein.
 *
 * Die Namen sind bewusst nur hier verdrahtet: dasselbe Wertepaar heisst in der
 * Mobile-App EXPO_PUBLIC_* und in Next NEXT_PUBLIC_*. Deshalb nimmt
 * createBautaktClient die Werte als Argumente entgegen.
 */
/**
 * Erzwingt einen nicht-leeren Wert.
 *
 * ⚠️ Ein fehlender Wert darf hier keinen Fallback bekommen — es gibt keine
 * sinnvolle Standard-Datenbank. Ohne diese Pruefung wuerde supabase-js tief im
 * Inneren mit „supabaseUrl is required" scheitern: das Deploy waere gruen und
 * die Seite weiss. Diese Meldung sagt stattdessen, was zu tun ist.
 *
 * Auf den leeren String pruefen, nicht nur auf `undefined`: eine im
 * Vercel-Dashboard angelegte, aber nicht befuellte Variable liefert `''`. Genau
 * das hat am 2026-08-27 den Marketing-Build abgebrochen.
 */
function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `${name} fehlt oder ist leer. In den Vercel-Projekteinstellungen setzen und ` +
        'neu deployen — Vite ersetzt VITE_* zur Build-Zeit, ein Neustart genuegt nicht.',
    );
  }
  return trimmed;
}

export const supabase = createBautaktClient(
  requireEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  requireEnv('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
);
