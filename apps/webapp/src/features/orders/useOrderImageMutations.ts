import { hasPermission } from '@bautakt/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { orderImageStoragePath } from './orderImageAccess';
import { OrderImagePrepareError, prepareOrderImage } from './prepareOrderImage';
import { ORDER_IMAGE_SIGNED_URL_TTL_SECONDS, type OrderPhoto } from './useOrderImages';

async function invalidateOrderImages(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string | undefined,
) {
  await queryClient.invalidateQueries({ queryKey: ['order-images', companyId] });
}

function rememberPhoto(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
  orderId: string,
  photo: OrderPhoto,
) {
  queryClient.setQueryData<OrderPhoto[]>(['order-images', companyId, orderId], (current) => {
    const next = (current ?? []).filter((item) => item.id !== photo.id);
    next.push(photo);
    next.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
    return next;
  });
}

function forgetPhoto(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
  imageId: string,
) {
  queryClient.setQueriesData<OrderPhoto[]>({ queryKey: ['order-images', companyId] }, (current) =>
    current ? current.filter((item) => item.id !== imageId) : current,
  );
}

/**
 * Ein Foto hochladen.
 *
 * Erst die Datei, dann die Zeile. Schlägt das Insert fehl, wird das Objekt
 * wieder entfernt — sonst liegt eine Datei ohne Zeile, und die Handy-App
 * zeigt sie nicht. Die `id` hat kein Default und kommt vom Client. `user_id`
 * ist der angemeldete Nutzer, weil die Insert-Policy das verlangt.
 */
export function useUploadOrderImage() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (input: { orderId: string; file: File }): Promise<OrderPhoto> => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');
      if (!hasPermission(membership?.permissions, 'canTakePhotos')) {
        throw new Error('FORBIDDEN');
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', companyId)
        .eq('id', input.orderId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order) throw new Error('FORBIDDEN');

      const prepared = await prepareOrderImage(input.file);
      const imageId = crypto.randomUUID();
      const storagePath = orderImageStoragePath(companyId, input.orderId, imageId);
      const now = new Date().toISOString();

      const uploaded = await supabase.storage
        .from('order-images')
        .upload(storagePath, prepared.blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      if (uploaded.error) throw uploaded.error;

      const { error: insertError } = await supabase.from('order_images').insert({
        id: imageId,
        company_id: companyId,
        order_id: input.orderId,
        user_id: user.id,
        storage_path: storagePath,
        taken_at: prepared.takenAt,
        width: prepared.width,
        height: prepared.height,
        created_at: now,
        modified_at: now,
      });
      if (insertError) {
        const removed = await supabase.storage.from('order-images').remove([storagePath]);
        if (removed.error && !isMissingStorageObject(removed.error)) {
          throw new Error('STORAGE_CLEANUP_FAILED');
        }
        throw insertError;
      }

      const signed = await supabase.storage
        .from('order-images')
        .createSignedUrl(storagePath, ORDER_IMAGE_SIGNED_URL_TTL_SECONDS);

      return {
        id: imageId,
        takenAt: prepared.takenAt,
        signedUrl: signed.data?.signedUrl ?? '',
        userId: user.id,
        storagePath,
      };
    },
    onSuccess: async (photo, variables) => {
      if (!companyId) return;
      if (photo.signedUrl) rememberPhoto(queryClient, companyId, variables.orderId, photo);
      await invalidateOrderImages(queryClient, companyId);
    },
  });
}

/**
 * Ein Foto löschen.
 *
 * Dieselbe Reihenfolge wie `order_image.delete` in der Handy-App: erst das
 * Storage-Objekt, „nicht gefunden“ zählt als Erfolg, dann die Zeile. Ein
 * zweiter Versuch nach einer unterbrochenen Löschung trifft die fehlende
 * Datei und entfernt dann die Zeile. Die Galerie lädt erst neu, wenn die
 * Zeile weg ist.
 *
 * Der Pfad kommt aus der Zeile, nicht aus der Oberfläche. Bliebe die Datei
 * nach einem still fehlgeschlagenen Storage-Delete stehen (die Policy filtert
 * sie aus der Antwort), darf die Zeile nicht mitgelöscht werden — sonst ist
 * der Pfad weg und niemand räumt das Objekt mehr auf.
 */
export function useDeleteOrderImage() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (imageId: string) => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');
      const canTakePhotos = hasPermission(membership?.permissions, 'canTakePhotos');
      const canManageOrders = hasPermission(membership?.permissions, 'canManageOrders');
      if (!canTakePhotos && !canManageOrders) throw new Error('FORBIDDEN');

      const { data: row, error: readError } = await supabase
        .from('order_images')
        .select('id, storage_path, user_id')
        .eq('company_id', companyId)
        .eq('id', imageId)
        .maybeSingle();
      if (readError) throw readError;
      if (!row) throw new Error('FORBIDDEN');
      if (!canManageOrders && row.user_id !== user.id) throw new Error('FORBIDDEN');

      const removed = await supabase.storage.from('order-images').remove([row.storage_path]);
      if (removed.error && !isMissingStorageObject(removed.error)) {
        throw storageFailure(removed.error);
      }
      await assertStorageObjectGone(row.storage_path);

      const { data, error } = await supabase
        .from('order_images')
        .delete()
        .eq('company_id', companyId)
        .eq('id', imageId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('FORBIDDEN');
    },
    onSuccess: async (_result, imageId) => {
      if (!companyId) return;
      forgetPhoto(queryClient, companyId, imageId);
      await invalidateOrderImages(queryClient, companyId);
    },
  });
}

export function orderImageErrorCode(error: unknown): string {
  if (error instanceof OrderImagePrepareError) return error.code;
  if (error instanceof Error && error.message) return error.message;
  return '';
}

async function assertStorageObjectGone(storagePath: string): Promise<void> {
  // HEAD. Mitglieder dürfen die Datei lesen; bleibt sie nach dem Delete
  // stehen, hat die Policy das Objekt nur aus der Antwort gefiltert.
  const probe = await supabase.storage.from('order-images').exists(storagePath);
  if (probe.data) throw new Error('FORBIDDEN');
}

function isMissingStorageObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = 'status' in error ? String(error.status) : '';
  const statusCode = 'statusCode' in error ? String(error.statusCode) : '';
  if (status === '404' || statusCode === '404') return true;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return /not found|does not exist/i.test(message);
}

function storageFailure(error: unknown): Error {
  if (!error || typeof error !== 'object') return new Error('FORBIDDEN');
  const status = 'status' in error ? String(error.status) : '';
  const statusCode = 'statusCode' in error ? String(error.statusCode) : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  if (
    status === '401' ||
    status === '403' ||
    statusCode === '401' ||
    statusCode === '403' ||
    /unauthorized|row-level security|permission/i.test(message)
  ) {
    return new Error('FORBIDDEN');
  }
  return error instanceof Error ? error : new Error(message || 'FORBIDDEN');
}
