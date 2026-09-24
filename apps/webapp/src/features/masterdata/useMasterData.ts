import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

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
};

/** Artikelkatalog des Betriebs. */
export function useArticles() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['articles', companyId],
    enabled: Boolean(companyId),
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

/** Kostenstellen des Betriebs. */
export function useCostCenters() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['cost-centers', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CostCenterRow[]> => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, code, name')
        .eq('company_id', companyId!)
        .order('code', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
