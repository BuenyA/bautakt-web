import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

import {
  isCalendarDate,
  type OrderChecklistItem,
  type OrderChecklistParent,
  type OrderChecklistSnapshot,
} from './orderChecklistDraft';

type EmploymentEmbed = {
  display_first_name: string | null;
  display_last_name: string | null;
  ended_at: string | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type ItemQueryRow = {
  id: string;
  title: string;
  is_done: boolean;
  position: number;
  due_date: string | null;
  assigned_employment_id: string | null;
  done_at: string | null;
  created_at: string;
  modified_at: string | null;
  employments: EmploymentEmbed | EmploymentEmbed[] | null;
};

function oneEmployment(value: EmploymentEmbed | EmploymentEmbed[] | null): EmploymentEmbed | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** `date` kommt als `YYYY-MM-DD`. Ein Zeitstempel davor würde sonst beim nächsten Schreiben auf NULL fallen. */
function asDateOnly(value: string | null): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return isCalendarDate(day) ? day : null;
}

function mapItem(row: ItemQueryRow): OrderChecklistItem {
  const employment = oneEmployment(row.employments);
  const dueDate = asDateOnly(row.due_date);
  return {
    id: row.id,
    title: row.title,
    isDone: row.is_done,
    position: row.position,
    dueDate,
    assignedEmploymentId: row.assigned_employment_id,
    doneAt: row.done_at,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    assignee: employment ? employmentDisplayName(employment) : '',
    assigneeEnded: Boolean(employment?.ended_at),
  };
}

/**
 * Die eine Checkliste eines Auftrags, die älteste nach `created_at`.
 *
 * Es gibt keinen Unique-Constraint auf `order_id`. Die Handy-App legt pro
 * Auftrag genau eine Liste an. Liegen doch zwei, bleibt die ältere die, an
 * der die App hängt — die neuere wird hier nicht mit angezeigt und nicht
 * gelöscht.
 */
export async function findOrderChecklist(
  companyId: string,
  orderId: string,
): Promise<OrderChecklistParent | null> {
  const { data, error } = await supabase
    .from('checklists')
    .select('id, title, user_id, created_at, modified_at')
    .eq('company_id', companyId)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    userId: data.user_id,
    createdAt: data.created_at,
    modifiedAt: data.modified_at,
  };
}

export async function loadOrderChecklist(
  companyId: string,
  orderId: string,
): Promise<OrderChecklistSnapshot> {
  const checklist = await findOrderChecklist(companyId, orderId);
  if (!checklist) return { checklist: null, items: [] };

  const { data, error } = await supabase
    .from('checklist_items')
    .select(
      `id, title, is_done, position, due_date, assigned_employment_id, done_at, created_at, modified_at,
       employments ( display_first_name, display_last_name, ended_at, profiles ( first_name, last_name ) )`,
    )
    .eq('company_id', companyId)
    .eq('checklist_id', checklist.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return {
    checklist,
    items: ((data ?? []) as unknown as ItemQueryRow[]).map(mapItem),
  };
}

/**
 * Checkliste eines Auftrags.
 *
 * Dieselben Tabellen `checklists` und `checklist_items`, die die Handy-App
 * schreibt. queryKey beginnt mit dem Mandanten. Ohne Lese- oder Schreibrecht
 * ist die Abfrage aus: der Block ist dann gar nicht da, nicht ein leerer
 * Hinweis. Schreiben liegt in `useOrderChecklistMutations`.
 */
export function useOrderChecklist(orderId: string | undefined, enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['order-checklist', companyId, orderId],
    enabled: Boolean(companyId && orderId) && enabled,
    queryFn: () => loadOrderChecklist(companyId!, orderId!),
  });
}
