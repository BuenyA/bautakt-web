import { Navigate, useSearchParams } from 'react-router';

import { legacyTimesOrderParam, routes } from '@/lib/routes';

/**
 * `/zeiten` gab es bis 2026-10-11 als eigenen Bereich. Mit `?order=` führt der
 * alte Link auf den Auftrag (dort stehen dessen Zeiten), sonst auf die Übersicht.
 */
export function LegacyTimesRedirect() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get(legacyTimesOrderParam)?.trim();
  return <Navigate to={orderId ? routes.order(orderId) : routes.overview} replace />;
}
