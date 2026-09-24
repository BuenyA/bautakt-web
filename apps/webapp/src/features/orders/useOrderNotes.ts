import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type OrderNote = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  modifiedAt: string | null;
  author: string;
};

type OrderNoteQueryRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  modified_at: string | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

function authorName(
  profile: { first_name: string | null; last_name: string | null } | null,
): string {
  if (!profile) return '';
  return [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

function mapOrderNote(row: OrderNoteQueryRow): OrderNote {
  return {
    id: row.id,
    title: row.title.trim(),
    body: row.body.trim(),
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    author: authorName(row.profiles),
  };
}

/**
 * Notizen eines Auftrags, nur lesend.
 *
 * Die Handy-App schreibt die Zeilen nach `order_notes`. Die Webapp zeigt sie
 * an und legt nichts an. queryKey beginnt mit dem Mandanten.
 *
 * Sortierung ist `created_at` absteigend: das ist der Schreibzeitpunkt. Der
 * Index `(order_id, modified_at desc nulls last, created_at desc)` wuerde
 * Notizen ohne `modified_at` nach hinten schieben — die Spalte hat keinen
 * Default und ist null, bis die App sie spaeter setzt.
 */
export function useOrderNotes(orderId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['order-notes', companyId, orderId],
    enabled: Boolean(companyId && orderId),
    queryFn: async (): Promise<OrderNote[]> => {
      const { data, error } = await supabase
        .from('order_notes')
        .select('id, title, body, created_at, modified_at, profiles(first_name, last_name)')
        .eq('company_id', companyId!)
        .eq('order_id', orderId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapOrderNote);
    },
  });
}
