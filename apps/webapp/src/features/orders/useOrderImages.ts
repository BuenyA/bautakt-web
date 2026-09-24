import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/** Dieselbe Frist wie in der Handy-App. Der Bucket `order-images` ist privat. */
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Kurz vor Ablauf neu signieren. Der globale staleTime von 30s wuerde bei jedem
 * Besuch neu signieren; eine Stunde ohne Refresh laesst die Bilder in einer
 * offen gelassenen Seite sterben, weil die Signatur dann ungueltig ist.
 */
const SIGNED_URL_REFRESH_MS = 50 * 60 * 1000;

export type OrderPhoto = {
  id: string;
  takenAt: string;
  signedUrl: string;
};

/**
 * Fotos eines Auftrags, nur lesend.
 *
 * Die Handy-App schreibt die Zeilen nach `order_images` und die Dateien in den
 * Bucket `order-images`. Die Webapp zeigt sie an und legt nichts an.
 * queryKey beginnt mit dem Mandanten.
 */
export function useOrderImages(orderId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['order-images', companyId, orderId],
    enabled: Boolean(companyId && orderId),
    staleTime: SIGNED_URL_REFRESH_MS,
    gcTime: SIGNED_URL_REFRESH_MS + 5 * 60 * 1000,
    refetchInterval: SIGNED_URL_REFRESH_MS,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OrderPhoto[]> => {
      const { data, error } = await supabase
        .from('order_images')
        .select('id, storage_path, taken_at')
        .eq('company_id', companyId!)
        .eq('order_id', orderId!)
        .order('taken_at', { ascending: false });

      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];

      const signed = await Promise.all(
        rows.map(async (row) => {
          const result = await supabase.storage
            .from('order-images')
            .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
          if (result.error || !result.data?.signedUrl) return null;
          return {
            id: row.id,
            takenAt: row.taken_at,
            signedUrl: result.data.signedUrl,
          };
        }),
      );

      const photos = signed.filter((photo): photo is OrderPhoto => photo !== null);
      // Eine einzelne fehlende Datei soll den Rest nicht verstecken. Schlaegt
      // das Signieren fuer alle fehl, ist die Galerie kaputt und der
      // Fehlerzustand mit erneutem Versuch der richtige Ausgang.
      if (photos.length === 0) {
        throw new Error('order image signed urls failed');
      }
      return photos;
    },
  });
}
