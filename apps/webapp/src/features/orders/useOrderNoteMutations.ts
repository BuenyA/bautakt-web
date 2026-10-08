import { hasPermission } from '@bautakt/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { type OrderNoteDraft, orderNoteIssue } from './orderNoteDraft';

async function invalidateOrderNotes(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string | undefined,
) {
  await queryClient.invalidateQueries({ queryKey: ['order-notes', companyId] });
}

/**
 * Notiz anlegen oder den Text ändern.
 *
 * Anlegen schreibt dieselbe Zeile wie der Sync der Handy-App: clientseitige
 * `id` (die Spalte hat kein Default), `user_id` des angemeldeten Nutzers,
 * `created_at` und `modified_at`. Beide Zeitstempel sind derselbe Augenblick,
 * damit die Liste nicht sofort „Geändert …“ zeigt.
 *
 * Bearbeiten schreibt nur `title`, `body` und `modified_at`. Autor,
 * `created_at`, Betrieb und Auftrag bleiben stehen — die Handy-App
 * überschreibt sie beim nächsten Last-Write-Wins aus ihrem Cache, und ein
 * mitgeschickter Autor würde den Namen unter der Notiz austauschen. Die
 * Datenbank prüft den Autor seit dem 11.08.2026 nicht mehr.
 *
 * Ist der getrimmte Text unverändert, gibt es keinen Schreibzugriff. Sonst
 * wanderte `modified_at` und die Karte zeigte eine Änderung, die keine ist.
 */
export function useSaveOrderNote() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: OrderNoteDraft) => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');
      if (!hasPermission(membership?.permissions, 'canCreateNotes')) {
        throw new Error('FORBIDDEN');
      }
      if (orderNoteIssue(draft)) throw new Error('INVALID_ORDER_NOTE');

      const title = draft.title.trim();
      const body = draft.body.trim();
      const now = new Date().toISOString();

      if (draft.id) {
        const { data: existing, error: existingError } = await supabase
          .from('order_notes')
          .select('title, body')
          .eq('company_id', companyId)
          .eq('order_id', draft.orderId)
          .eq('id', draft.id)
          .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) throw new Error('FORBIDDEN');
        if (existing.title.trim() === title && existing.body.trim() === body) return;

        const { data, error } = await supabase
          .from('order_notes')
          .update({ title, body, modified_at: now })
          .eq('company_id', companyId)
          .eq('order_id', draft.orderId)
          .eq('id', draft.id)
          .select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('FORBIDDEN');
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', companyId)
        .eq('id', draft.orderId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order) throw new Error('FORBIDDEN');

      const { error } = await supabase.from('order_notes').insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        order_id: draft.orderId,
        user_id: user.id,
        title,
        body,
        created_at: now,
        modified_at: now,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateOrderNotes(queryClient, companyId);
    },
  });
}

/**
 * Notiz löschen.
 *
 * Eine von RLS verschluckte Löschung liefert sonst Erfolg ohne Zeile —
 * `.select('id')` macht daraus einen Fehler.
 */
export function useDeleteOrderNote() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');
      if (!hasPermission(membership?.permissions, 'canCreateNotes')) {
        throw new Error('FORBIDDEN');
      }

      const { data, error } = await supabase
        .from('order_notes')
        .delete()
        .eq('company_id', companyId)
        .eq('id', noteId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('FORBIDDEN');
    },
    onSuccess: async () => {
      await invalidateOrderNotes(queryClient, companyId);
    },
  });
}
