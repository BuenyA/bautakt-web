import { type BautaktClient, createBautaktClient } from '@bautakt/supabase';

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
 *
 * ⚠️ Fehlende Env darf hier NICHT im Modulkopf werfen. Frueher rief
 * `requireEnv` beim Import `throw` auf — bevor React mountet. Auf Vercel war
 * das Bundle mit `undefined` gebaut; Ergebnis: weisse Seite ohne UI. Stattdessen
 * liefert `supabaseBootError` eine Meldung, und `main.tsx` zeigt die
 * BootError-Seite. Der Client entsteht nur, wenn die Werte stehen.
 */

function readEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  // Leeren String wie fehlend behandeln: eine in Vercel angelegte, aber nicht
  // befuellte Variable liefert `''` (siehe wiki/pages/fallstricke.md).
  return trimmed ? trimmed : null;
}

/**
 * Lesbare Bootstrap-Meldung, wenn VITE_* zur Build-Zeit fehlte oder leer war.
 * `null` heisst: Konfiguration ok, `supabase` ist ein echter Client.
 */
export function getSupabaseBootError(): string | null {
  const missing: string[] = [];
  if (!readEnv(import.meta.env.VITE_SUPABASE_URL)) {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }
  if (missing.length === 0) return null;

  return (
    `${missing.join(' und ')} ${missing.length === 1 ? 'fehlt' : 'fehlen'} oder ${missing.length === 1 ? 'ist' : 'sind'} leer. ` +
    'In den Vercel-Projekteinstellungen von bautakt-webapp setzen und neu deployen — ' +
    'Vite ersetzt VITE_* zur Build-Zeit, ein Neustart genuegt nicht.'
  );
}

/** Einmal ausgewertet beim Modul-Load; `main.tsx` entscheidet daran den Render-Pfad. */
export const supabaseBootError: string | null = getSupabaseBootError();

function createConfiguredClient(): BautaktClient {
  const url = readEnv(import.meta.env.VITE_SUPABASE_URL);
  const key = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);
  if (!url || !key) {
    // Nur als Sicherheitsnetz, falls jemand den Client trotz Boot-Fehler anfasst.
    throw new Error(supabaseBootError ?? 'Supabase-Konfiguration fehlt.');
  }
  return createBautaktClient(url, key);
}

/**
 * Typisierter Client. Nur verwenden, wenn `supabaseBootError === null`.
 * Bei fehlender Env mountet `main.tsx` die App nicht; dieser Export ist dann
 * ein Platzhalter, der bei erstem Zugriff wirft (nicht beim Import).
 */
export const supabase: BautaktClient = supabaseBootError
  ? (new Proxy({} as BautaktClient, {
      get() {
        throw new Error(supabaseBootError);
      },
    }) as BautaktClient)
  : createConfiguredClient();
