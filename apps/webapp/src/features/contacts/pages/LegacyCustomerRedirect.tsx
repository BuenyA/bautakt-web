import { Navigate, useParams } from 'react-router';

import { routes } from '@/lib/routes';

/**
 * `/kunden` und `/kunden/:id` von vor den Kontakten (bis 2026-10-14). Die
 * Kunden-IDs sind die Kontakt-IDs geblieben, alte Links kommen also an.
 */
export function LegacyCustomerRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? routes.contact(id) : `${routes.contacts}?rolle=kunden`} replace />;
}
