import { Navigate, useParams } from 'react-router';

import { routes } from '@/lib/routes';

/** `/einsaetze/:id` von vor der Umbenennung auf `/einsatzplanung/:id`, damit alte Links ankommen. */
export function LegacyAssignmentRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? routes.assignment(id) : routes.assignments} replace />;
}
