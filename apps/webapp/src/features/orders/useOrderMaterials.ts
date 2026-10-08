import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { finiteOrNull } from './orderMaterialDraft';

export type OrderMaterial = {
  id: string;
  articleId: string | null;
  articleTitle: string;
  customTitle: string;
  quantity: number;
  unit: string;
  unitCost: number | null;
  unitPrice: number | null;
  notes: string;
  /** `YYYY-MM-DD`. */
  usedAt: string;
  billed: boolean;
  userId: string;
  author: string;
};

type OrderMaterialQueryRow = {
  id: string;
  article_id: string | null;
  custom_title: string | null;
  quantity: unknown;
  unit: string;
  unit_cost: unknown;
  unit_price: unknown;
  notes: string;
  used_at: string;
  billed_document_id: string | null;
  user_id: string;
  articles: { title: string } | { title: string }[] | null;
  profiles:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null;
};

function oneArticle(value: OrderMaterialQueryRow['articles']): { title: string } | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function oneProfile(
  value: OrderMaterialQueryRow['profiles'],
): { first_name: string | null; last_name: string | null } | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function authorName(
  profile: { first_name: string | null; last_name: string | null } | null,
): string {
  if (!profile) return '';
  return [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

function mapOrderMaterial(row: OrderMaterialQueryRow): OrderMaterial {
  return {
    id: row.id,
    articleId: row.article_id,
    articleTitle: oneArticle(row.articles)?.title.trim() ?? '',
    customTitle: row.custom_title?.trim() ?? '',
    quantity: finiteOrNull(row.quantity) ?? 0,
    unit: row.unit,
    unitCost: finiteOrNull(row.unit_cost),
    unitPrice: finiteOrNull(row.unit_price),
    notes: row.notes.trim(),
    usedAt: row.used_at.slice(0, 10),
    billed: Boolean(row.billed_document_id),
    userId: row.user_id,
    author: authorName(oneProfile(row.profiles)),
  };
}

/** Anzeigetext: Freitext, sonst der Artikelname. Leer, wenn beides fehlt. */
export function materialLabel(row: Pick<OrderMaterial, 'customTitle' | 'articleTitle'>): string {
  return row.customTitle || row.articleTitle;
}

/**
 * Material eines Auftrags.
 *
 * Dieselbe Tabelle `order_materials`, die die Handy-App schreibt. queryKey
 * beginnt mit dem Mandanten. Der Index `order_materials_order_id_used_at_idx`
 * liegt auf `(order_id, used_at DESC, created_at DESC)` und trifft diese
 * Sortierung. _Stand 2026-10-08._
 *
 * Wer die Zeilen nicht lesen darf, bekommt eine leere Liste — dieselbe
 * Oberfläche wie bei einem Auftrag ohne Material.
 */
export function useOrderMaterials(orderId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['order-materials', companyId, orderId],
    enabled: Boolean(companyId && orderId),
    queryFn: async (): Promise<OrderMaterial[]> => {
      const { data, error } = await supabase
        .from('order_materials')
        .select(
          'id, article_id, custom_title, quantity, unit, unit_cost, unit_price, notes, used_at, billed_document_id, user_id, articles(title), profiles(first_name, last_name)',
        )
        .eq('company_id', companyId!)
        .eq('order_id', orderId!)
        .order('used_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ((data ?? []) as unknown as OrderMaterialQueryRow[]).map(mapOrderMaterial);
    },
  });
}
