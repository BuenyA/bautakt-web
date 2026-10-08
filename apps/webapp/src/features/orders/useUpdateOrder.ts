import { hasPermission } from '@bautakt/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  type OrderEditDraft,
  orderEditIssue,
  type OrderEditSource,
  orderUpdatePatch,
} from './orderEdit';

/**
 * Hängt an diesem Auftrag mindestens eine Belegposition?
 *
 * `order_id` steht auf `sales_document_lines`, nicht auf `sales_documents`.
 * Die Select-Policy lässt die Zeilen nur mit `canUseBillingModule`,
 * `canViewOrderFinance` oder `canViewManagementInvoices`. Ein Polier darf
 * Aufträge ändern und sieht die Positionen nicht — für ihn bleibt die
 * Antwort falsch, der Hinweis erscheint nicht. Gemessen 2026-10-08.
 */
export function useOrderHasSalesDocuments(orderId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['sales-document-lines', companyId, 'by-order', orderId],
    enabled: Boolean(companyId && orderId),
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('sales_document_lines')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId!)
        .eq('order_id', orderId!);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}

/**
 * Stammdaten eines Auftrags ändern.
 *
 * Teilpatch auf `id` und `company_id`, danach `.select('id').maybeSingle()`.
 * Kommt keine Zeile zurück, ist das ein Rechtefehler: RLS meldet ein
 * verweigertes Update oft als Erfolg ohne Zeile. `modified_at` hat keinen
 * Trigger und keinen Default; der Client setzt ihn, sobald sich ein Feld
 * ändert. Ohne Änderung gibt es keinen Schreibzugriff.
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (input: { order: OrderEditSource; draft: OrderEditDraft }) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');
      if (!hasPermission(membership?.permissions, 'canManageOrders')) {
        throw new Error('FORBIDDEN');
      }
      if (orderEditIssue(input.draft)) throw new Error('INVALID_ORDER');

      const patch = orderUpdatePatch(input.order, input.draft, new Date().toISOString());
      if (!patch) return 'unchanged' as const;

      const { data, error } = await supabase
        .from('orders')
        .update(patch)
        .eq('company_id', companyId)
        .eq('id', input.order.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('FORBIDDEN');
      return 'saved' as const;
    },
    onSuccess: async (result) => {
      if (result !== 'saved') return;
      await queryClient.invalidateQueries({ queryKey: ['orders', companyId] });
    },
  });
}
