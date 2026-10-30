import { Navigate, useSearchParams } from 'react-router';

import { legacyTimesOrderParam, routes } from '@/lib/routes';

/**
 * `/zeiten` gab es bis 2026-10-11 als eigenen Bereich. Mit `?order=` führt der
 * alte Link auf die Zeiten des Auftrags, sonst auf die Übersicht.
 */
export function LegacyTimesRedirect() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get(legacyTimesOrderParam)?.trim();
  return (
    <Navigate to={orderId ? routes.orderSection(orderId, 'times') : routes.overview} replace />
  );
}
