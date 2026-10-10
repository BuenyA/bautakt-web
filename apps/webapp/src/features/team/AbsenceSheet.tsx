import { todayIso } from '@bautakt/finance';
import {
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  DrawerBody,
  DrawerHeader,
  Label,
  Select,
  Textarea,
} from '@fluentui/react-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DateRangePicker } from '@/components/form/dateTime';
import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import { ABSENCE_TYPES } from './absenceValues';
import { useEmployees } from './useEmployees';

/**
 * Abwesenheit eintragen.
 *
 * ⚠️ Ueber die RPC `create_absence_for_employment` und nicht per `insert`: sie
 * prueft, wer fuer wen eintragen darf, und setzt Betrieb und Antragsteller
 * selbst. Die Id erwartet sie als Parameter — `absences` hat kein Default
 * (siehe wiki/pages/fallstricke.md).
 *
 * ⚠️ Die Funktion legt die Abwesenheit direkt als `genehmigt` an, nicht als
 * offenen Antrag: wer sie hier eintraegt, hat `canManageAbsences` und ist damit
 * selbst die entscheidende Stelle. Offene Antraege entstehen in der Handy-App.
 * Das Formular sagt das auch — sonst wartet jemand auf eine Genehmigung, die
 * schon erteilt ist.
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
    <FormDrawer open={open} onOpenChange={onOpenChange}>
      {open ? <AbsenceForm onDone={() => onOpenChange(false)} /> : null}
    </FormDrawer>
  );
}

function AbsenceForm({ onDone }: { onDone: () => void }) {
  const typeFieldId = useId();
  const employeeFieldId = useId();
  const { t } = useTranslation();
  const create = useCreateAbsence();
  const employees = useEmployees();
  const ids = { start: useId(), end: useId(), note: useId() };

  const [employmentId, setEmploymentId] = useState('');
  const [type, setType] = useState<string>('urlaub');
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
      setError(readableDbError(caught) ?? t('domain:absenceForm.saveError'));
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {t('domain:absenceForm.title')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:absenceForm.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={employeeFieldId}>{t('domain:absences.columns.employee')}</Label>
          <Select
            id={employeeFieldId}
            value={employmentId}
            onChange={(_, { value }) => setEmploymentId(value)}
          >
            <option value="" disabled>
              {t('domain:timeForm.choose')}
            </option>
            {selectable.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name || t('domain:employees.unnamed')}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={typeFieldId}>{t('domain:absences.columns.type')}</Label>
          <Select id={typeFieldId} value={type} onChange={(_, { value }) => setType(value)}>
            {ABSENCE_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`domain:absences.types.${value}`)}
              </option>
            ))}
          </Select>
        </div>

        <DateRangePicker
          startId={ids.start}
          endId={ids.end}
          startLabel={t('domain:absenceForm.start')}
          endLabel={t('domain:absenceForm.end')}
          startAriaLabel={t('domain:absenceForm.start')}
          endAriaLabel={t('domain:absenceForm.end')}
          start={startDate}
          end={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          rangeMessage={t('domain:absenceForm.endBeforeStart')}
        />

        <div className="grid gap-2">
          <Label htmlFor={ids.note}>{t('domain:customerForm.notes')}</Label>
          <Textarea
            id={ids.note}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {error && error !== t('domain:absenceForm.endBeforeStart') ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </DrawerBody>

      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={create.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}
