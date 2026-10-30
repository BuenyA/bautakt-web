import { hasPermission } from '@bautakt/core';
import { useOutletContext } from 'react-router';

import { useMembership } from '@/features/company/useMembership';
import type { OrderSection } from '@/lib/routes';

import { canCreateDailyReport } from './dailyReportAccess';
import type { OrderDetail } from './useOrder';

/** Reihenfolge der Reiter und der Vorschau-Karten. */
export const ORDER_SECTIONS: readonly OrderSection[] = [
  'photos',
  'notes',
  'checklist',
  'times',
  'materials',
  'reports',
];

/** Überschrift je Unterseite; zugleich Beschriftung des Reiters und der Karte. */
export const ORDER_SECTION_TITLE = {
  photos: 'domain:orders.photos.title',
  notes: 'domain:orders.notes.title',
  checklist: 'domain:orders.checklist.title',
  times: 'domain:orders.times.title',
  materials: 'domain:orders.materials.title',
  reports: 'domain:orders.dailyReports.title',
} as const satisfies Record<OrderSection, string>;

/**
 * Welche Unterseiten eines Auftrags sichtbar sind. Dieselben Rechte, mit
 * denen sich die Abschnitte bisher selbst ausgeblendet haben: Checkliste mit
 * Lese- oder Schreibrecht, Bautagebuch nur mit Recht zum Anlegen. `null`,
 * solange die Mitgliedschaft lädt.
 */
export function useVisibleOrderSections(): ReadonlySet<OrderSection> | null {
  const { data: membership, isPending } = useMembership();
  if (isPending) return null;
  const permissions = membership?.permissions;
  return new Set(
    ORDER_SECTIONS.filter((section) => {
      if (section === 'checklist') {
        return (
          hasPermission(permissions, 'canViewChecklist') ||
          hasPermission(permissions, 'canEditChecklist')
        );
      }
      if (section === 'reports') return canCreateDailyReport(permissions);
      return true;
    }),
  );
}

/** Der geladene Auftrag aus `OrderDetailLayout`, für Übersicht und Unterseiten. */
export function useOrderOutlet(): OrderDetail {
  return useOutletContext<OrderDetail>();
}
