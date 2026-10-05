import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type CostCenterDraft = {
  code: string;
  name: string;
};

/** Die Kostenstelle haengt noch an Auftraegen. Loeschen wuerde die Zuordnung nur nullen. */
export class CostCenterInUseError extends Error {
  readonly orderCount: number;

  constructor(orderCount: number) {
    super('COST_CENTER_IN_USE');
    this.name = 'CostCenterInUseError';
    this.orderCount = orderCount;
  }
}

export function isDuplicateCostCenterCode(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}

/**
 * Legt eine Kostenstelle an.
 *
 * `cost_centers.id` hat kein Default — die Id kommt vom Client, wie bei den
 * anderen Tabellen, die die Handy-App offline anlegt (wiki/pages/fallstricke.md).
 * Die Nummer ist je Betrieb eindeutig, ohne Ruecksicht auf Grossschreibung
 * (`cost_centers_company_code_unique`).
 */
export function useCreateCostCenter() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: CostCenterDraft) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');

      const { error } = await supabase.from('cost_centers').insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        code: draft.code.trim(),
        name: draft.name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cost-centers', companyId] });
    },
  });
}

/**
 * Loescht eine Kostenstelle, aber nur wenn kein Auftrag mehr darauf zeigt.
 *
 * `orders.cost_center_id` ist `ON DELETE SET NULL`. Ein direktes Delete wuerde
 * die Zuordnung still loesen und `cost_center_label` stehen lassen. Die
 * Zaehlung passiert unmittelbar vor dem Delete; ein Auftrag, der genau
 * dazwischen verknuepft wird, kann trotzdem genullt werden. Das schliesst erst
 * ein `ON DELETE RESTRICT` in bautakt-app.
 */
export function useDeleteCostCenter() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');

      const { count, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('cost_center_id', id);

      if (countError) throw countError;
      if (count == null) throw new Error('COUNT_FAILED');
      if (count > 0) throw new CostCenterInUseError(count);

      const { data, error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
        .select('id');

      if (error) throw error;
      // RLS meldet ein verweigertes Delete oft als Erfolg mit leerer Antwort.
      if (!data || data.length === 0) throw new Error('FORBIDDEN');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cost-centers', companyId] });
    },
    onError: async (error) => {
      if (error instanceof CostCenterInUseError) {
        await queryClient.invalidateQueries({ queryKey: ['cost-centers', companyId] });
      }
    },
  });
}
