import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/** Vollstaendig typisierter Supabase-Client fuer dieses Projekt. */
export type BautaktClient = SupabaseClient<Database>;

/**
 * Erzeugt den Browser-Client.
 *
 * ⚠️ URL und Key werden als Argumente uebergeben. Diese Funktion liest bewusst
 * NIE selbst `process.env` oder `import.meta.env`: dasselbe Wertepaar heisst je
 * nach Konsument anders (`VITE_*` in apps/webapp, `NEXT_PUBLIC_*` in Next,
 * `EXPO_PUBLIC_*` in bautakt-app). Ein geteiltes Paket kann das nicht wissen,
 * also entscheidet der Aufrufer.
 *
 * Drei bewusste Abweichungen von bautakt-app/app/lib/supabase/supabase.ts:
 *
 * 1. `detectSessionInUrl: true` (dort false). Noetig, damit Recovery- und
 *    Bestaetigungslinks, die auf app.bautakt.com landen, ihre Session auch
 *    einloesen.
 * 2. Kein `processLock`. Das ist eine React-Native-Sache; im Browser nutzt
 *    supabase-js von sich aus `navigator.locks`.
 * 3. Kein AppState-Wiring fuer start/stopAutoRefresh — es gibt kein AppState.
 */
export function createBautaktClient(url: string, anonKey: string): BautaktClient {
  if (!url || !anonKey) {
    throw new Error(
      'createBautaktClient: URL und Anon-Key sind erforderlich. Fehlt die .env-Datei?',
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      ...(typeof window !== 'undefined' ? { storage: window.localStorage } : {}),
    },
  });
}
