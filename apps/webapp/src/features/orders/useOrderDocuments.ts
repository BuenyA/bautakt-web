import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  FINANCE_DOCUMENTS_BUCKET,
  ORDER_DOCUMENT_SIGNED_URL_TTL_SECONDS,
  ORDER_DOCUMENTS_BUCKET,
  orderDocumentBucket,
} from './orderDocumentFiles';

/** Kurz vor Ablauf neu signieren, wie bei den Fotos. */
const SIGNED_URL_REFRESH_MS = 50 * 60 * 1000;

export type OrderDocumentCategory = {
  id: string;
  slug: string | null;
  name: string;
  sortOrder: number;
  isHidden: boolean;
};

export type OrderDocument = {
  id: string;
  categoryId: string;
  userId: string;
  name: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  fileSize: number | null;
  source: string;
  createdAt: string;
  /** Leer, wenn die Datei fehlt oder nicht signiert werden durfte. */
  signedUrl: string;
};

/**
 * Ordner der Auftragsdokumente. Firmenweit, die Datenbank legt sie beim
 * Anlegen eines Betriebs an (`seed_order_document_categories`). Lesen mit
 * `canViewDocuments`.
 */
export function useOrderDocumentCategories(enabled = true) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['order-document-categories', companyId],
    enabled: Boolean(companyId) && enabled,
    queryFn: async (): Promise<OrderDocumentCategory[]> => {
      const { data, error } = await supabase
        .from('order_document_categories')
        .select('id, slug, name, sort_order, is_hidden')
        .eq('company_id', companyId!)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        sortOrder: row.sort_order,
        isHidden: row.is_hidden,
      }));
    },
  });
}

/**
 * Dokumente eines Auftrags, neueste zuerst.
 *
 * Archivierte Rechnungen und Angebote liegen im Bucket `finance-documents`;
 * ohne Finanzrecht liefert die Select-Policy diese Zeilen gar nicht erst.
 * Signiert wird je Bucket in einem Aufruf. Hochladen, Ändern und Löschen
 * sitzen in `useOrderDocumentMutations` und invalidieren
 * `['order-documents', companyId]`.
 */
export function useOrderDocuments(orderId: string | undefined, enabled = true) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['order-documents', companyId, orderId],
    enabled: Boolean(companyId && orderId) && enabled,
    staleTime: SIGNED_URL_REFRESH_MS,
    gcTime: SIGNED_URL_REFRESH_MS + 5 * 60 * 1000,
    refetchInterval: SIGNED_URL_REFRESH_MS,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OrderDocument[]> => {
      const { data, error } = await supabase
        .from('order_documents')
        .select(
          'id, category_id, user_id, name, file_name, mime_type, storage_path, file_size, source, created_at',
        )
        .eq('company_id', companyId!)
        .eq('order_id', orderId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];

      const urls = new Map<string, string>();
      for (const bucket of [ORDER_DOCUMENTS_BUCKET, FINANCE_DOCUMENTS_BUCKET]) {
        const paths = rows
          .map((row) => row.storage_path)
          .filter((path) => orderDocumentBucket(path) === bucket);
        if (paths.length === 0) continue;
        const signed = await supabase.storage
          .from(bucket)
          .createSignedUrls(paths, ORDER_DOCUMENT_SIGNED_URL_TTL_SECONDS);
        // Eine fehlende Datei soll die Liste nicht verstecken; die Zeile
        // bleibt sichtbar, nur ohne Link.
        for (const item of signed.data ?? []) {
          if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
        }
      }

      return rows.map((row) => ({
        id: row.id,
        categoryId: row.category_id,
        userId: row.user_id,
        name: row.name,
        fileName: row.file_name,
        mimeType: row.mime_type,
        storagePath: row.storage_path,
        fileSize: row.file_size,
        source: row.source,
        createdAt: row.created_at,
        signedUrl: urls.get(row.storage_path) ?? '',
      }));
    },
  });
}
