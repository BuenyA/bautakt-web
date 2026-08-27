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
export const supabase = createBautaktClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
