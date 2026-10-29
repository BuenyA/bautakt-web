import { Navigate, useLocation } from 'react-router';

import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { MembershipGate } from '@/features/company/MembershipGate';
import { routes } from '@/lib/routes';

import { useAuth } from './useAuth';

/**
 * Guard fuer angemeldete Bereiche.
 *
 * Bewusst eine Komponente und kein Route-Loader: Loader laufen ausserhalb von
 * React und koennen den AuthProvider-Context nicht lesen. Ein Loader-Guard
 * muesste bei jeder Navigation erneut getSession() aufrufen.
 *
 * ⚠️ Die initializing-Abfrage muss vor der session-Abfrage stehen. Sonst wird
 * bei jedem Reload umgeleitet, waehrend die Sitzung noch geladen wird.
 *
 * Die Mitgliedschaft prueft `MembershipGate` hier und nicht als zusaetzliche
 * Route-Ebene: `router.tsx` bleibt damit fuer andere Aenderungen ruhig.
 */
export function ProtectedRoute() {
  const { session, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageSpinner />;
  if (!session) return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;

  return <MembershipGate />;
}
