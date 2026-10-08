import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { canCreateOrderMaterial, canEditOrderMaterial } from './orderMaterialAccess';
import {
  materialUnchanged,
  type MaterialWrite,
  materialWrite,
  type OrderMaterialDraft,
  orderMaterialIssue,
} from './orderMaterialDraft';

/**
 * Die Zeile steht auf einem festgeschriebenen Beleg.
 *
 * Der Trigger `enforce_order_material_billing_fields` hält
 * `billed_document_id` nur für Konten ohne `canUseBillingModule` fest
 * (gemessen 2026-10-08). Geschäftsführung käme sonst durch. Die Oberfläche
 * lehnt es ab, bevor sie schreibt.
 */
export class OrderMaterialBilledError extends Error {
  constructor() {
    super('ORDER_MATERIAL_BILLED');
    this.name = 'OrderMaterialBilledError';
  }
}

async function invalidateMaterialViews(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string | undefined,
) {
  // Die Liste am Auftrag hängt an `order-materials`. Ein Beleg liest das
  // Material nicht live: der Entwurf ist eine Kopie. Invalidieren, damit eine
  // offene Belegliste nicht auf dem Stand vor dem Speichern hängen bleibt.
  // Der nächste Entwurf, den die Handy-App baut, nimmt `unit_price` und, wenn
  // das leer ist, `unit_cost`.
  await queryClient.invalidateQueries({ queryKey: ['order-materials', companyId] });
  await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
  await queryClient.invalidateQueries({ queryKey: ['sales-document', companyId] });
}

/**
 * Material anlegen oder die fachlichen Felder ändern.
 *
 * Anlegen schreibt dieselbe Zeile wie der Sync der Handy-App: clientseitige
 * `id` (die Spalte hat kein Default), `user_id` des angemeldeten Nutzers,
 * `created_at` und `modified_at`. Genau eines von Artikel und Freitext.
 *
 * Bearbeiten schreibt Artikel, Freitext, Menge, Einheit, beide Preise, Notiz,
 * Datum und `modified_at`. Beide Titelspalten gehen immer mit, sonst bliebe
 * die alte stehen und der Check `article_id` XOR `custom_title` scheiterte.
 * Ungeschrieben bleiben `user_id`, `icon`, `is_billable`, `billed_document_id`
 * und `daily_report_id`.
 *
 * Ist der Inhalt gleich, gibt es keinen Schreibzugriff — sonst wanderte
 * `modified_at` ohne sichtbare Änderung.
 */
export function useSaveOrderMaterial() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: OrderMaterialDraft) => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');
      if (draft.billed) throw new OrderMaterialBilledError();
      if (orderMaterialIssue(draft)) throw new Error('INVALID_ORDER_MATERIAL');

      const next = materialWrite(draft);
      if (!next) throw new Error('INVALID_ORDER_MATERIAL');

      if (draft.id) {
        await updateMaterial(companyId, user.id, membership?.permissions, draft.id, next);
        return;
      }

      if (!canCreateOrderMaterial(membership?.permissions)) throw new Error('FORBIDDEN');
      await insertMaterial(companyId, user.id, draft.orderId, next);
    },
    onSuccess: async () => {
      await invalidateMaterialViews(queryClient, companyId);
    },
  });
}

async function assertArticleInCompany(companyId: string, articleId: string | null) {
  if (!articleId) return;
  const { data, error } = await supabase
    .from('articles')
    .select('id')
    .eq('company_id', companyId)
    .eq('id', articleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('FORBIDDEN');
}

async function insertMaterial(
  companyId: string,
  userId: string,
  orderId: string,
  next: MaterialWrite,
) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('company_id', companyId)
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error('FORBIDDEN');

  await assertArticleInCompany(companyId, next.article_id);

  const now = new Date().toISOString();
  const { error } = await supabase.from('order_materials').insert({
    id: crypto.randomUUID(),
    company_id: companyId,
    order_id: orderId,
    user_id: userId,
    ...next,
    created_at: now,
    modified_at: now,
  });
  if (error) throw error;
}

async function updateMaterial(
  companyId: string,
  userId: string,
  permissions: Parameters<typeof canEditOrderMaterial>[0],
  materialId: string,
  next: MaterialWrite,
) {
  const { data: existing, error: existingError } = await supabase
    .from('order_materials')
    .select(
      'user_id, article_id, custom_title, quantity, unit, unit_cost, unit_price, notes, used_at, billed_document_id',
    )
    .eq('company_id', companyId)
    .eq('id', materialId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw new Error('FORBIDDEN');
  if (existing.billed_document_id) throw new OrderMaterialBilledError();
  if (!canEditOrderMaterial(permissions, userId, existing)) throw new Error('FORBIDDEN');
  if (materialUnchanged(existing, next)) return;

  await assertArticleInCompany(companyId, next.article_id);

  const { data, error } = await supabase
    .from('order_materials')
    .update({ ...next, modified_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', materialId)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('FORBIDDEN');
}

/**
 * Material löschen.
 *
 * Abgerechnete Zeilen bleiben stehen. Eine von RLS verschluckte Löschung
 * liefert sonst Erfolg ohne Zeile — `.select('id')` macht daraus einen Fehler.
 */
export function useDeleteOrderMaterial() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (materialId: string) => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');

      const { data: existing, error: existingError } = await supabase
        .from('order_materials')
        .select('user_id, billed_document_id')
        .eq('company_id', companyId)
        .eq('id', materialId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) throw new Error('FORBIDDEN');
      if (existing.billed_document_id) throw new OrderMaterialBilledError();
      if (!canEditOrderMaterial(membership?.permissions, user.id, existing)) {
        throw new Error('FORBIDDEN');
      }

      const { data, error } = await supabase
        .from('order_materials')
        .delete()
        .eq('company_id', companyId)
        .eq('id', materialId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('FORBIDDEN');
    },
    onSuccess: async () => {
      await invalidateMaterialViews(queryClient, companyId);
    },
  });
}
