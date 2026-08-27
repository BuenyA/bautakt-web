import type { Session, User } from '@supabase/supabase-js';
import { createContext } from 'react';

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /**
   * True, solange die Session beim Start noch aus dem localStorage
   * wiederhergestellt wird. ⚠️ Wer das ignoriert, wirft eingeloggte Nutzer bei
   * jedem Reload auf /login — siehe AuthProvider.
   */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
