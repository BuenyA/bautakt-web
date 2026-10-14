import { Navigate, useLocation } from 'react-router';

import { routes } from '@/lib/routes';

/**
 * `/ausgaben` hieß bis 2026-10-14 die Seite der Eingangsrechnungen. Die Query
 * reist mit: `?bereich=sonstige` öffnet das zweite Register, `?neu=1` das
 * Anlege-Panel.
 */
export function LegacyExpensesRedirect() {
  const { search } = useLocation();
  return <Navigate to={`${routes.expenses}${search}`} replace />;
}
