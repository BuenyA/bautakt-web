import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';

import { AuthContext, type AuthContextValue } from './AuthContext';
import { authErrorKey } from './authErrors';

/**
 * Haelt die Supabase-Sitzung.
 *
 * Bewusste Abweichung von bautakt-app: dort liest AuthContext.tsx die Session
 * genau einmal beim Mount und abonniert onAuthStateChange nicht. Daraus folgt
 * dort unter anderem der Umweg beim Passwort-Reset (nach verifyOtp wird
 * ausgeloggt, weil der Provider die neue Sitzung sonst nie sieht). Hier wird
 * abonniert.
 *
 * Drei Fallstricke, die in diesem Muster regelmaessig zuschlagen:
 *
 * 1. ⚠️ `initializing`. Das Wiederherstellen der Sitzung aus dem localStorage
 *    ist asynchron. Ohne dieses Flag sieht ProtectedRoute in der ersten
 *    Runde `session === null` und wirft eingeloggte Nutzer bei jedem Reload
 *    auf /login.
 *
 * 2. ⚠️ Im onAuthStateChange-Callback wird NICHT auf weitere Supabase-Aufrufe
 *    gewartet. Das SDK haelt waehrend des Callbacks einen Lock; ein
 *    `await supabase.from(...)` darin kann blockieren. Der Callback setzt nur
 *    State — alles Weitere laeuft ueber TanStack Query in eigenen Hooks.
 *
 * 3. ⚠️ Beim Abmelden wird der Query-Cache geleert. Sonst sieht der naechste
 *    Nutzer im selben Browser die Zeilen des vorigen. In diesem Projekt gab es
 *    bereits ein mandantenuebergreifendes Leck (resolve_labor_rate) — das ist
 *    keine hypothetische Fehlerklasse.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Siehe Fallstrick 2: hier nur State setzen, nichts awaiten.
      setSession(nextSession);
      setInitializing(false);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: authErrorKey(error) };
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    return { error: authErrorKey(error) };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const requestPasswordReset = useCallback<AuthContextValue['requestPasswordReset']>(
    async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/passwort-zuruecksetzen`,
      });
      return { error: authErrorKey(error) };
    },
    [],
  );

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: authErrorKey(error) };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [session, initializing, signIn, signUp, signOut, requestPasswordReset, updatePassword],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
