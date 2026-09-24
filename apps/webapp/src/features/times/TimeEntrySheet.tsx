import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
  toast,
} from '@bautakt/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { useOrders } from '@/features/orders/useOrders';
import { useEmployees } from '@/features/team/useEmployees';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import { type TimeEntryDraft, toTimestamp } from './timeEntryDraft';

function useSaveTimeEntry() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: TimeEntryDraft) => {
      const startedAt = toTimestamp(draft.date, draft.startTime);
      const endedAt = toTimestamp(draft.date, draft.endTime);
      if (!startedAt) throw new Error('Kein gültiger Beginn.');

      const row = {
        company_id: companyId!,
        order_id: draft.orderId,
        employment_id: draft.employmentId || null,
        started_at: startedAt,
        ended_at: endedAt,
        break_minutes: Math.max(0, Math.round(Number(draft.breakMinutes) || 0)),
        note: draft.note.trim(),
      };

      // ⚠️ `time_entries.id` hat kein Default — siehe wiki/pages/fallstricke.md.
      const query = draft.id
        ? supabase.from('time_entries').update(row).eq('id', draft.id).eq('company_id', companyId!)
        : supabase.from('time_entries').insert({ ...row, id: crypto.randomUUID() });

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['time-entries', companyId] });
    },
  });
}

/**
 * Zeiteintrag nachtragen oder korrigieren.
 *
 * Im Buero ist das der Nachtrag fuer jemanden, der auf der Baustelle nicht
 * gestempelt hat — deshalb steht die Mitarbeiterauswahl mit im Formular und
 * nicht der angemeldete Nutzer fest.
 */
export function TimeEntrySheet({
  draft,
  open,
  onOpenChange,
}: {
  draft: TimeEntryDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open && draft ? (
          <TimeEntryForm initial={draft} onDone={() => onOpenChange(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TimeEntryForm({ initial, onDone }: { initial: TimeEntryDraft; onDone: () => void }) {
  const { t } = useTranslation();
  const save = useSaveTimeEntry();
  const orders = useOrders('all');
  const employees = useEmployees();

  const [draft, setDraft] = useState<TimeEntryDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const ids = { date: useId(), start: useId(), end: useId(), pause: useId(), note: useId() };

  // Ausgeschiedene stehen nicht zur Auswahl — fuer sie wird nichts mehr erfasst.
  const selectableEmployees = (employees.data ?? []).filter((employee) => !employee.ended_at);

  function set(patch: Partial<TimeEntryDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!draft.orderId) {
      setError(t('domain:timeForm.orderRequired'));
      return;
    }
    if (draft.endTime && draft.endTime <= draft.startTime) {
      // Ein Eintrag ueber Mitternacht ist im Buero fast immer ein Tippfehler;
      // die Nachtschicht traegt das Handy ein.
      setError(t('domain:timeForm.endBeforeStart'));
      return;
    }

    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:timeForm.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:timeForm.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>
          {draft.id ? t('domain:timeForm.editTitle') : t('domain:timeForm.newTitle')}
        </SheetTitle>
        <SheetDescription>{t('domain:timeForm.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label>{t('domain:times.columns.order')}</Label>
          <Select value={draft.orderId} onValueChange={(value) => set({ orderId: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('domain:timeForm.choose')} />
            </SelectTrigger>
            <SelectContent>
              {(orders.data ?? []).map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>{t('domain:times.columns.employee')}</Label>
          <Select
            value={draft.employmentId}
            onValueChange={(value) => set({ employmentId: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('domain:timeForm.choose')} />
            </SelectTrigger>
            <SelectContent>
              {selectableEmployees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name || t('domain:employees.unnamed')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.date}>{t('domain:timeForm.date')}</Label>
          <Input
            id={ids.date}
            type="date"
            value={draft.date}
            onChange={(event) => set({ date: event.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor={ids.start}>{t('domain:times.columns.start')}</Label>
            <Input
              id={ids.start}
              type="time"
              value={draft.startTime}
              onChange={(event) => set({ startTime: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.end}>{t('domain:times.columns.end')}</Label>
            <Input
              id={ids.end}
              type="time"
              value={draft.endTime}
              onChange={(event) => set({ endTime: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.pause}>{t('domain:timeForm.break')}</Label>
            <Input
              id={ids.pause}
              inputMode="numeric"
              className="text-right tabular-nums"
              value={draft.breakMinutes}
              onChange={(event) => set({ breakMinutes: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.note}>{t('domain:times.columns.note')}</Label>
          <Textarea
            id={ids.note}
            rows={3}
            value={draft.note}
            onChange={(event) => set({ note: event.target.value })}
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {t('common:action.save')}
        </Button>
      </SheetFooter>
    </form>
  );
}
