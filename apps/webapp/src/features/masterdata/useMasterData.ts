import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { aggregateCostCenterStats } from './costCenterStats';

export type ArticleRow = {
  id: string;
  title: string;
  description: string;
  unit: string;
  purchase_price: number | null;
  sale_price: number | null;
  stock_quantity: number | null;
  min_stock: number | null;
  storage_location: string | null;
  is_active: boolean;
};

export type CostCenterRow = {
  id: string;
  code: string;
  name: string;
  /** Auftraege mit dieser `cost_center_id`, unabhaengig vom Status. */
  orderCount: number;
  /** Summe der hinterlegten Auftragssummen in Euro. `null`, wenn keine gesetzt ist. */
  contractSum: number | null;
};

/**
 * Artikelkatalog des Betriebs.
 *
 * Dieselbe Abfrage nutzt die Materialerfassung am Auftrag, nur zur Auswahl.
 * `enabled: false` lässt den Cache in Ruhe, solange das Formular nicht
 * aufgehen kann.
 */
export function useArticles(options?: { enabled?: boolean }) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['articles', companyId],
    enabled: Boolean(companyId) && enabled,
    queryFn: async (): Promise<ArticleRow[]> => {
      const { data, error } = await supabase
        .from('articles')
        .select(
          'id, title, description, unit, purchase_price, sale_price, stock_quantity, min_stock, storage_location, is_active',
        )
        .eq('company_id', companyId!)
        .order('title', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Kostenstellen des Betriebs, mit Anzahl und Auftragssumme der verknuepften
 * Auftraege. Beide Abfragen filtern auf `company_id`; die Kennzahl steht in
 * wiki/pages/kostenstellen.md.
 */
export function useCostCenters() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['cost-centers', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CostCenterRow[]> => {
      const [centers, orders] = await Promise.all([
        supabase
          .from('cost_centers')
          .select('id, code, name')
          .eq('company_id', companyId!)
          .order('code', { ascending: true }),
        supabase
          .from('orders')
          .select('cost_center_id, contract_sum')
          .eq('company_id', companyId!)
          .not('cost_center_id', 'is', null),
      ]);

      if (centers.error) throw centers.error;
      if (orders.error) throw orders.error;

      const stats = aggregateCostCenterStats(orders.data ?? []);
      return (centers.data ?? []).map((center) => {
        const stat = stats.get(center.id);
        return {
          id: center.id,
          code: center.code,
          name: center.name,
          orderCount: stat?.orderCount ?? 0,
          contractSum: stat?.contractSum ?? null,
        };
      });
    },
  });
}
