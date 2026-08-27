import { Navigate, Outlet } from 'react-router';

import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { HOME_ROUTE } from '@/lib/routes';

import { useAuth } from './useAuth';

/** Login und Registrierung sind fuer Angemeldete uninteressant — direkt weiter. */
export function PublicOnlyRoute() {
  const { session, initializing } = useAuth();

  if (initializing) return <FullPageSpinner />;
  if (session) return <Navigate to={HOME_ROUTE} replace />;

  return <Outlet />;
}
