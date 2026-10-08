import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/** Dieselbe Frist wie in der Handy-App. Der Bucket `order-images` ist privat. */
export const ORDER_IMAGE_SIGNED_URL_TTL_SECONDS = 3600;

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
  userId: string;
  storagePath: string;
};

/**
 * Fotos eines Auftrags.
 *
 * Die Handy-App schreibt die Zeilen nach `order_images` und die Dateien in den
 * Bucket `order-images`. Hochladen und Loeschen sitzen in
 * `useOrderImageMutations` und invalidieren `['order-images', companyId]`.
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
        .select('id, storage_path, taken_at, user_id')
        .eq('company_id', companyId!)
        .eq('order_id', orderId!)
        .order('taken_at', { ascending: false });

      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];

      const signed = await Promise.all(
        rows.map(async (row) => {
          // storage_path liegt fertig in der Zeile: {companyId}/{orderId}/{imageId}.jpg.
          // Nicht selbst bauen und nicht getPublicUrl: der Bucket ist privat.
          const result = await supabase.storage
            .from('order-images')
            .createSignedUrl(row.storage_path, ORDER_IMAGE_SIGNED_URL_TTL_SECONDS);
          if (result.error || !result.data?.signedUrl) return null;
          return {
            id: row.id,
            takenAt: row.taken_at,
            signedUrl: result.data.signedUrl,
            userId: row.user_id,
            storagePath: row.storage_path,
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
