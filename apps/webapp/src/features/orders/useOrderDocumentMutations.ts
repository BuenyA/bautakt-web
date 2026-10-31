import { hasPermission } from '@bautakt/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  isFinanceArchivePath,
  MAX_ORDER_DOCUMENT_BYTES,
  ORDER_DOCUMENTS_BUCKET,
  orderDocumentMimeType,
  orderDocumentStoragePath,
} from './orderDocumentFiles';

async function invalidateOrderDocuments(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string | undefined,
) {
  await queryClient.invalidateQueries({ queryKey: ['order-documents', companyId] });
}

/**
 * Ein Dokument hochladen.
 *
 * Wie bei den Fotos: erst die Datei, dann die Zeile. Schlägt das Insert fehl,
 * wird das Objekt wieder entfernt. Die `id` kommt vom Client, `user_id` ist
 * der angemeldete Nutzer. Die Spalten sind dieselben, die der Sync-Handler
 * `order_document.upsert` der Handy-App schreibt.
 */
export function useUploadOrderDocument() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      categoryId: string;
      name: string;
      file: File;
    }): Promise<void> => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');
      if (!hasPermission(membership?.permissions, 'canUploadAndEditDocuments')) {
        throw new Error('FORBIDDEN');
      }
      const name = input.name.trim();
      if (!name) throw new Error('NAME_REQUIRED');
      const mimeType = orderDocumentMimeType(input.file.name, input.file.type);
      if (!mimeType) throw new Error('UNSUPPORTED_FILE');
      if (input.file.size > MAX_ORDER_DOCUMENT_BYTES) throw new Error('FILE_TOO_LARGE');

      const documentId = crypto.randomUUID();
      const storagePath = orderDocumentStoragePath(
        companyId,
        input.orderId,
        documentId,
        mimeType,
        input.file.name,
      );

      // Bei einer Datei schickt supabase-js Formulardaten, der Speicher nimmt
      // dann den Typ der Datei selbst, nicht `contentType`. Ohne Typ vom
      // Browser (häufig bei Word) wiese der Bucket sie ab.
      const body = new File([input.file], input.file.name, { type: mimeType });
      const uploaded = await supabase.storage
        .from(ORDER_DOCUMENTS_BUCKET)
        .upload(storagePath, body, { contentType: mimeType, upsert: false });
      if (uploaded.error) throw uploaded.error;

      const { error: insertError } = await supabase.from('order_documents').insert({
        id: documentId,
        company_id: companyId,
        order_id: input.orderId,
        category_id: input.categoryId,
        user_id: user.id,
        name,
        file_name: input.file.name,
        mime_type: mimeType,
        storage_path: storagePath,
        file_size: input.file.size,
        source: 'manual',
        created_at: new Date().toISOString(),
      });
      if (insertError) {
        const removed = await supabase.storage.from(ORDER_DOCUMENTS_BUCKET).remove([storagePath]);
        if (removed.error && !isMissingStorageObject(removed.error)) {
          throw new Error('STORAGE_CLEANUP_FAILED');
        }
        throw insertError;
      }
    },
    onSuccess: async () => {
      await invalidateOrderDocuments(queryClient, companyId);
    },
  });
}

/** Name oder Ordner ändern. Die Datei bleibt, wo sie ist. */
export function useUpdateOrderDocument() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (input: { id: string; name: string; categoryId: string }) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');
      const name = input.name.trim();
      if (!name) throw new Error('NAME_REQUIRED');
      const { data, error } = await supabase
        .from('order_documents')
        .update({
          name,
          category_id: input.categoryId,
          modified_at: new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .eq('id', input.id)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('FORBIDDEN');
    },
    onSuccess: async () => {
      await invalidateOrderDocuments(queryClient, companyId);
    },
  });
}

/**
 * Ein Dokument löschen. Reihenfolge wie `order_document.delete` in der App:
 * erst das Storage-Objekt („nicht gefunden“ zählt als Erfolg), dann die
 * Zeile. Bei archivierten Belegen wird nur die Verknüpfung entfernt; das
 * Original im Belegarchiv bleibt.
 */
export function useDeleteOrderDocument() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');
      if (!hasPermission(membership?.permissions, 'canUploadAndEditDocuments')) {
        throw new Error('FORBIDDEN');
      }

      // Der Pfad kommt aus der Zeile, nicht aus der Oberfläche.
      const { data: row, error: readError } = await supabase
        .from('order_documents')
        .select('id, storage_path')
        .eq('company_id', companyId)
        .eq('id', documentId)
        .maybeSingle();
      if (readError) throw readError;
      if (!row) throw new Error('FORBIDDEN');

      if (!isFinanceArchivePath(row.storage_path)) {
        const removed = await supabase.storage
          .from(ORDER_DOCUMENTS_BUCKET)
          .remove([row.storage_path]);
        if (removed.error && !isMissingStorageObject(removed.error)) throw removed.error;
        // Filtert die Policy das Objekt nur aus der Antwort, bliebe es
        // stehen; dann darf die Zeile mit dem Pfad nicht verschwinden.
        const probe = await supabase.storage.from(ORDER_DOCUMENTS_BUCKET).exists(row.storage_path);
        if (probe.data) throw new Error('FORBIDDEN');
      }

      const { data, error } = await supabase
        .from('order_documents')
        .delete()
        .eq('company_id', companyId)
        .eq('id', documentId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('FORBIDDEN');
    },
    onSuccess: async () => {
      await invalidateOrderDocuments(queryClient, companyId);
    },
  });
}

export function orderDocumentErrorCode(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

function isMissingStorageObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = 'status' in error ? String(error.status) : '';
  const statusCode = 'statusCode' in error ? String(error.statusCode) : '';
  if (status === '404' || statusCode === '404') return true;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return /not found|does not exist/i.test(message);
}
