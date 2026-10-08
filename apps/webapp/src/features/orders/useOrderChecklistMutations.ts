import { hasPermission } from '@bautakt/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  applyChecklistChange,
  type ChecklistChange,
  type OrderChecklistItem,
  type OrderChecklistParent,
  type OrderChecklistSnapshot,
  readChecklistFields,
} from './orderChecklistDraft';
import { findOrderChecklist, loadOrderChecklist } from './useOrderChecklist';

/**
 * Checkliste speichern, wie `checklist.upsert` in der Handy-App.
 *
 * Eine Mutation schreibt den Parent und danach die komplette Item-Liste.
 * Zuerst werden die Punkte upsertet (`onConflict: id`), dann verschwinden
 * die Ids, die in der Liste fehlen. Die Endlage ist dieselbe wie im
 * Sync-Handler. Die umgekehrte Reihenfolge ließe bei einem Abbruch nach dem
 * Löschen eine leere Liste zurück.
 *
 * Unveränderte Punkte gehen mit ihrem bisherigen `modified_at` mit. Nur wer
 * sich geändert hat, bekommt einen neuen Stempel — sonst sähe eine Zeile
 * neuer aus, an der niemand etwas geändert hat. Der Parent bekommt immer
 * einen neuen `modified_at`, wenn die Liste sich geändert hat. `title`,
 * `user_id` und `created_at` der Liste bleiben stehen. Auftrags-Checklisten
 * haben in den vorhandenen Zeilen einen leeren Titel; das Formular zeigt
 * ihn nicht.
 *
 * Vor dem Schreiben wird die Liste neu gelesen und die eine Änderung darauf
 * angewendet. Ein Punkt, der schon auf dem Server liegt, bleibt in der
 * Liste. Was die Handy-App noch nicht hochgeladen hat, sieht dieser Lesevorgang
 * nicht: der nächste Push der kompletten Liste von dort kann den Punkt aus
 * dem Web löschen, und umgekehrt. Das ist das Sync-Modell, kein Unfall der
 * Oberfläche.
 *
 * Die Liste entsteht erst mit dem ersten Punkt. Eine leere Liste bleibt als
 * Parent stehen, damit die Handy-App ihre Id behält. Persönliche Listen
 * (`order_id` null) werden hier nicht angefasst.
 */

let checklistWriteTail: Promise<void> = Promise.resolve();
let openChecklistMutations = 0;

function enqueueChecklistWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = checklistWriteTail.then(task, task);
  checklistWriteTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function beginChecklistMutation() {
  openChecklistMutations += 1;
}

/** true, wenn keine Checklisten-Mutation mehr offen ist. */
function finishChecklistMutation(): boolean {
  openChecklistMutations = Math.max(0, openChecklistMutations - 1);
  return openChecklistMutations === 0;
}

function checklistQueryKey(companyId: string | undefined, orderId: string) {
  return ['order-checklist', companyId, orderId] as const;
}

function normalizedChange(change: ChecklistChange): ChecklistChange {
  if (change.kind !== 'create' && change.kind !== 'update') return change;
  const fields = readChecklistFields({
    title: change.title,
    dueDate: change.dueDate ?? '',
    assignedEmploymentId: change.assignedEmploymentId ?? '',
  });
  if (!fields.ok) {
    if (fields.issue === 'date') throw new Error('INVALID_CHECKLIST_DATE');
    if (fields.issue === 'assignee') throw new Error('EMPLOYMENT_NOT_FOUND');
    throw new Error('INVALID_CHECKLIST_ITEM');
  }
  return { ...change, ...fields.fields };
}

async function assertAssignee(
  companyId: string,
  employmentId: string | null,
  previousId: string | null,
): Promise<void> {
  if (!employmentId) return;
  const { data, error } = await supabase
    .from('employments')
    .select('id, role, ended_at')
    .eq('company_id', companyId)
    .eq('id', employmentId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.role) throw new Error('EMPLOYMENT_NOT_FOUND');
  if (data.ended_at && employmentId !== previousId) {
    throw new Error('CHECKLIST_ASSIGNEE_INACTIVE');
  }
}

async function ensureOrderChecklist(
  companyId: string,
  orderId: string,
  userId: string,
  now: string,
): Promise<OrderChecklistParent> {
  const existing = await findOrderChecklist(companyId, orderId);
  if (existing) return existing;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('company_id', companyId)
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error('FORBIDDEN');

  const id = crypto.randomUUID();
  const { data: inserted, error } = await supabase
    .from('checklists')
    .insert({
      id,
      company_id: companyId,
      order_id: orderId,
      user_id: userId,
      title: '',
      created_at: now,
      modified_at: now,
    })
    .select('id');
  if (error) throw error;
  if (!inserted?.length) throw new Error('FORBIDDEN');

  const winner = await findOrderChecklist(companyId, orderId);
  if (winner && winner.id !== id) {
    await supabase
      .from('checklists')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)
      .eq('order_id', orderId);
    return winner;
  }

  return {
    id,
    title: '',
    userId,
    createdAt: now,
    modifiedAt: now,
  };
}

function itemRow(companyId: string, checklistId: string, item: OrderChecklistItem) {
  return {
    id: item.id,
    company_id: companyId,
    checklist_id: checklistId,
    title: item.title,
    is_done: item.isDone,
    position: item.position,
    due_date: item.dueDate,
    assigned_employment_id: item.assignedEmploymentId,
    done_at: item.doneAt,
    created_at: item.createdAt,
    modified_at: item.modifiedAt,
  };
}

async function replaceChecklistItems(
  companyId: string,
  orderId: string,
  checklistId: string,
  items: OrderChecklistItem[],
  now: string,
): Promise<void> {
  const { data: parent, error: parentError } = await supabase
    .from('checklists')
    .update({ modified_at: now })
    .eq('id', checklistId)
    .eq('company_id', companyId)
    .eq('order_id', orderId)
    .select('id');
  if (parentError) throw parentError;
  if (!parent?.length) throw new Error('FORBIDDEN');

  if (items.length > 0) {
    const { data, error } = await supabase
      .from('checklist_items')
      .upsert(
        items.map((item) => itemRow(companyId, checklistId, item)),
        { onConflict: 'id' },
      )
      .select('id');
    if (error) throw error;
    if ((data?.length ?? 0) !== items.length) throw new Error('FORBIDDEN');
  }

  const keep = items.map((item) => item.id);
  let remove = supabase
    .from('checklist_items')
    .delete()
    .eq('company_id', companyId)
    .eq('checklist_id', checklistId);
  if (keep.length > 0) {
    remove = remove.not('id', 'in', `(${keep.join(',')})`);
  }
  const { error: removeError } = await remove;
  if (removeError) throw removeError;

  const { count, error: countError } = await supabase
    .from('checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('checklist_id', checklistId);
  if (countError) throw countError;
  // `count` ist null, wenn PostgREST keine Zahl liefert. Dann nicht jede
  // Speicherung als Konflikt melden. Weicht die Zahl ab, hat parallel jemand
  // eine Zeile gelegt oder das Delete griff nicht.
  if (count != null && count !== items.length) throw new Error('CHECKLIST_CONFLICT');
}

async function writeChecklist(
  companyId: string,
  userId: string,
  change: ChecklistChange,
): Promise<void> {
  const now = new Date().toISOString();
  const nextChange = normalizedChange(change);
  let snapshot = await loadOrderChecklist(companyId, nextChange.orderId);

  if (!snapshot.checklist) {
    // Abhaken oder Löschen ohne Liste legt keine leere Hülle an.
    if (nextChange.kind === 'delete') return;
    if (nextChange.kind !== 'create') throw new Error('CHECKLIST_ITEM_MISSING');
    await ensureOrderChecklist(companyId, nextChange.orderId, userId, now);
    snapshot = await loadOrderChecklist(companyId, nextChange.orderId);
  }

  // Ohne neu gelesene Liste nicht schreiben. Sonst ersetzte eine gerade
  // angelegte Hülle die Punkte einer Liste, die der Lesevorgang verpasst hat.
  if (!snapshot.checklist) throw new Error('FORBIDDEN');

  const previous = snapshot.items.find((item) => item.id === nextChange.id);
  if (nextChange.kind === 'create' || nextChange.kind === 'update') {
    await assertAssignee(
      companyId,
      nextChange.assignedEmploymentId,
      previous?.assignedEmploymentId ?? null,
    );
  }

  const applied = applyChecklistChange(snapshot.items, nextChange, now);
  if (!applied.ok) {
    if (applied.reason === 'missing') throw new Error('CHECKLIST_ITEM_MISSING');
    if (applied.reason === 'date') throw new Error('INVALID_CHECKLIST_DATE');
    if (applied.reason === 'assignee') throw new Error('EMPLOYMENT_NOT_FOUND');
    throw new Error('INVALID_CHECKLIST_ITEM');
  }
  if (!applied.changed) return;

  await replaceChecklistItems(
    companyId,
    nextChange.orderId,
    snapshot.checklist.id,
    applied.items,
    now,
  );
}

async function invalidateChecklist(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string | undefined,
) {
  await queryClient.invalidateQueries({ queryKey: ['order-checklist', companyId] });
}

/**
 * Punkt anlegen, ändern, abhaken oder löschen.
 *
 * Abhaken kippt die Checkbox sofort im Cache und rollt bei einem Fehler
 * nur diesen Punkt zurück. Löschen fasst den Cache erst an, wenn der
 * Server die Liste ohne den Punkt bestätigt hat.
 *
 * Jeder Aufruf schreibt die ganze Liste. Die Aufrufe eines Tabs laufen
 * nacheinander, jeder liest vorher neu. Sonst würde ein zweites Abhaken
 * die Liste vom ersten überschreiben und den Punkt verlieren. Die
 * Invalidierung wartet, bis keine Mutation mehr offen ist — ein Refetch
 * dazwischen würde den optimistischen Stand überschreiben.
 */
export function useSaveOrderChecklist() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: (change: ChecklistChange) => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');
      if (!hasPermission(membership?.permissions, 'canEditChecklist')) {
        throw new Error('FORBIDDEN');
      }
      return enqueueChecklistWrite(() => writeChecklist(companyId, user.id, change));
    },
    onMutate: async (change) => {
      beginChecklistMutation();
      if (!companyId || change.kind !== 'toggle') return;
      const key = checklistQueryKey(companyId, change.orderId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OrderChecklistSnapshot>(key);
      const prior = previous?.items.find((item) => item.id === change.id);
      const now = new Date().toISOString();
      queryClient.setQueryData<OrderChecklistSnapshot>(key, (current) => {
        if (!current) return current;
        const applied = applyChecklistChange(current.items, change, now);
        if (!applied.ok || !applied.changed) return current;
        return { ...current, items: applied.items };
      });
      return prior ? { isDone: prior.isDone, doneAt: prior.doneAt } : undefined;
    },
    onError: (_error, change, prior) => {
      if (!companyId || change.kind !== 'toggle' || !prior) return;
      queryClient.setQueryData<OrderChecklistSnapshot>(
        checklistQueryKey(companyId, change.orderId),
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) =>
              item.id === change.id
                ? { ...item, isDone: prior.isDone, doneAt: prior.doneAt }
                : item,
            ),
          };
        },
      );
    },
    onSuccess: (_data, change) => {
      if (!companyId || change.kind !== 'delete') return;
      queryClient.setQueryData<OrderChecklistSnapshot>(
        checklistQueryKey(companyId, change.orderId),
        (current) =>
          current
            ? { ...current, items: current.items.filter((item) => item.id !== change.id) }
            : current,
      );
    },
    onSettled: async () => {
      if (finishChecklistMutation()) await invalidateChecklist(queryClient, companyId);
    },
  });
}
