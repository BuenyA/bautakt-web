import { todayIso } from '@bautakt/finance';
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
import { supabase } from '@/lib/supabase';

import { useEmployees } from './useEmployees';

const ABSENCE_TYPES = ['vacation', 'sick', 'special', 'unpaid', 'training'] as const;

/**
 * Abwesenheit eintragen.
 *
 * ⚠️ Ueber die RPC `create_absence_for_employment` und nicht per `insert`: sie
 * prueft, wer fuer wen eintragen darf, und setzt Betrieb und Antragsteller
 * selbst. Die Id erwartet sie als Parameter — `absences` hat kein Default
 * (siehe wiki/pages/fallstricke.md).
 *
 * Genehmigt wird getrennt davon, in der Liste. Beides in einem Schritt zu
 * erledigen waere bequem, verwischt aber, dass Antrag und Entscheidung zwei
 * Vorgaenge sind.
 */
function useCreateAbsence() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();

  return useMutation({
    mutationFn: async (draft: {
      employmentId: string;
      type: string;
      startDate: string;
      endDate: string;
      note: string;
    }) => {
      const { error } = await supabase.rpc('create_absence_for_employment', {
        p_id: crypto.randomUUID(),
        p_employment_id: draft.employmentId,
        p_type: draft.type,
        p_start_date: draft.startDate,
        p_end_date: draft.endDate,
        p_note: draft.note.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['absences', membership?.companyId] });
    },
  });
}

export function AbsenceSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open ? <AbsenceForm onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function AbsenceForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const create = useCreateAbsence();
  const employees = useEmployees();
  const ids = { start: useId(), end: useId(), note: useId() };

  const [employmentId, setEmploymentId] = useState('');
  const [type, setType] = useState<string>('vacation');
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectable = (employees.data ?? []).filter((employee) => !employee.ended_at);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!employmentId) {
      setError(t('domain:absenceForm.employeeRequired'));
      return;
    }
    if (endDate < startDate) {
      setError(t('domain:absenceForm.endBeforeStart'));
      return;
    }

    try {
      await create.mutateAsync({ employmentId, type, startDate, endDate, note });
      toast.success(t('domain:absenceForm.saved'));
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('domain:absenceForm.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{t('domain:absenceForm.title')}</SheetTitle>
        <SheetDescription>{t('domain:absenceForm.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label>{t('domain:absences.columns.employee')}</Label>
          <Select value={employmentId} onValueChange={setEmploymentId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('domain:timeForm.choose')} />
            </SelectTrigger>
            <SelectContent>
              {selectable.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name || t('domain:employees.unnamed')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>{t('domain:absences.columns.type')}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ABSENCE_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`domain:absences.types.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.start}>{t('domain:absenceForm.start')}</Label>
            <Input
              id={ids.start}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.end}>{t('domain:absenceForm.end')}</Label>
            <Input
              id={ids.end}
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.note}>{t('domain:customerForm.notes')}</Label>
          <Textarea
            id={ids.note}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {t('common:action.save')}
        </Button>
      </SheetFooter>
    </form>
  );
}
