import { Navigate } from 'react-router';

import { PageSpinner } from '@/components/common/PageSpinner';
import { type OrderSection, routes } from '@/lib/routes';

import { OrderChecklist } from '../OrderChecklist';
import { OrderDailyReports } from '../OrderDailyReports';
import { OrderMaterials } from '../OrderMaterials';
import { OrderNotes } from '../OrderNotes';
import { OrderPhotos } from '../OrderPhotos';
import { useOrderOutlet, useVisibleOrderSections } from '../orderSections';
import { OrderTimes } from '../OrderTimes';

/**
 * Eine Unterseite eines Auftrags in voller Breite. Ohne Recht auf den
 * Bereich (etwa ein alter Link aufs Bautagebuch) geht es zur Übersicht —
 * eine leere Seite unter einem Reiter, den es nicht gibt, wäre rätselhaft.
 */
export function OrderSectionPage({ section }: { section: OrderSection }) {
  const order = useOrderOutlet();
  const visible = useVisibleOrderSections();
  if (!visible) return <PageSpinner />;
  if (!visible.has(section)) return <Navigate to={routes.order(order.id)} replace />;

  switch (section) {
    case 'photos':
      return <OrderPhotos orderId={order.id} />;
    case 'notes':
      return <OrderNotes orderId={order.id} />;
    case 'checklist':
      return <OrderChecklist orderId={order.id} />;
    case 'times':
      return <OrderTimes orderId={order.id} orderName={order.name} />;
    case 'materials':
      return <OrderMaterials orderId={order.id} />;
    case 'reports':
      return <OrderDailyReports orderId={order.id} />;
  }
}
