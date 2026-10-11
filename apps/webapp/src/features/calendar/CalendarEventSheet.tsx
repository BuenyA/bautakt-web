import {
  DangerButton,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  MessageBar,
  MessageBarBody,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Textarea,
} from '@fluentui/react-components';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismissLock } from '@/components/common/useDismissLock';
import { DatePicker, TimeInput } from '@/components/form/dateTime';
import { absenceConflict } from '@/features/assignments/absenceConflict';
import { useMembership } from '@/features/company/useMembership';
import { useAbsences } from '@/features/team/useAbsences';
import { readableDbError } from '@/lib/dbErrors';

import {
  type EventType,
  RECURRENCE_TYPES,
  type RecurrenceType,
  REMINDER_OPTIONS,
  withEnd,
  withStart,
} from './calendarModel';
import { type CalendarEventDraft, isSeriesOccurrence } from './eventDraft';
import {
  CalendarEventNotChangedError,
  type SeriesScope,
  useCalendarMutations,
} from './useCalendarMutations';

/**
 * Termin anlegen, ändern oder löschen — dieselben Felder wie in der Handy-App
 * (`app/(tabs)/calendar/new-event.tsx`): Titel, ganztägig, Beginn/Ende,
 * Termintyp, Wiederholung mit Ende, Erinnerung, Notizen.
 *
 * `readOnly`, wenn RLS das Ändern ohnehin ablehnen würde (Firmentermin ohne
 * `canManageAllCalendar`). Das Panel ist nur gemountet, solange es offen ist.
 */
export function CalendarEventSheet({
  draft,
  canManageAll,
  readOnly,
  onOpenChange,
}: {
  draft: CalendarEventDraft | null;
  canManageAll: boolean;
  readOnly: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dismiss = useDismissLock(onOpenChange);
  return (
    <FormDrawer open={draft !== null} onOpenChange={dismiss.handleOpenChange}>
      {draft ? (
        <EventForm
          initial={draft}
          canManageAll={canManageAll}
          readOnly={readOnly}
          onBusyChange={dismiss.onBusyChange}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormDrawer>
  );
}

function EventForm({
  initial,
  canManageAll,
  readOnly,
  onBusyChange,
  onDone,
}: {
  initial: CalendarEventDraft;
  canManageAll: boolean;
  readOnly: boolean;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { save, remove } = useCalendarMutations();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [scopeFor, setScopeFor] = useState<'save' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = {
    title: useId(),
    startDate: useId(),
    startTime: useId(),
    endDate: useId(),
    endTime: useId(),
    recurrence: useId(),
    until: useId(),
    reminder: useId(),
    notes: useId(),
  };

  const editing = initial.occurrence !== null;
  const series = isSeriesOccurrence(initial);
  // Eine Ausnahme oder ein Vorkommen ändert nie den Rhythmus der Serie allein.
  const recurrenceLocked = readOnly || Boolean(initial.occurrence?.isException);
  const showType = canManageAll || initial.eventType === 'all';
  const busy = save.isPending || remove.isPending;
  const { data: membership } = useMembership();
  const absences = useAbsences().data ?? [];
  // Eigener Termin an einem eigenen Abwesenheitstag: nur ein Hinweis, kein
  // Verbot — anders als beim Einsatz (Owner-Entscheidung 2026-10-11).
  const ownAbsence =
    !readOnly && draft.eventType === 'me' && membership?.employmentId
      ? (() => {
          const { approved, pending } = absenceConflict(
            absences,
            membership.employmentId,
            draft.startDate,
            draft.endDate,
          );
          return approved ?? pending;
        })()
      : null;

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  function set(patch: Partial<CalendarEventDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function failMessage(caught: unknown, fallbackKey: string) {
    if (caught instanceof CalendarEventNotChangedError) return t('domain:calendar.form.notChanged');
    return readableDbError(caught) ?? t(fallbackKey);
  }

  async function runSave(scope: SeriesScope) {
    setScopeFor(null);
    setError(null);
    try {
      await save.mutateAsync({ draft, scope });
      toast.success(t('domain:calendar.form.saved'));
      onDone();
    } catch (caught) {
      setError(failMessage(caught, 'domain:calendar.form.saveError'));
    }
  }

  async function runDelete(scope: SeriesScope) {
    setScopeFor(null);
    setConfirmDelete(false);
    setError(null);
    try {
      await remove.mutateAsync({ draft, scope });
      toast.success(t('domain:calendar.form.deleted'));
      onDone();
    } catch (caught) {
      setError(failMessage(caught, 'domain:calendar.form.deleteError'));
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (readOnly || busy) return;
    if (!draft.title.trim()) {
      setError(t('domain:calendar.form.titleRequired'));
      return;
    }
    if (draft.eventType === 'all' && !canManageAll) {
      setError(t('domain:calendar.form.companyForbidden'));
      return;
    }
    if (series && !initial.occurrence?.isException) {
      setScopeFor('save');
      return;
    }
    void runSave('all');
  }

  function askDelete() {
    if (series) setScopeFor('delete');
    else setConfirmDelete(true);
  }

  const title = readOnly
    ? t('domain:calendar.form.viewTitle')
    : editing
      ? t('domain:calendar.form.editTitle')
      : t('domain:calendar.form.newTitle');

  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 w-full flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>{title}</FormDrawerTitle>
        <FormDrawerDescription>
          {readOnly
            ? t('domain:calendar.form.readOnlyHint')
            : t('domain:calendar.form.description')}
        </FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        {ownAbsence ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              {t(
                ownAbsence.status === 'genehmigt'
                  ? 'domain:calendar.form.absenceHint'
                  : 'domain:calendar.form.absenceHintPending',
                {
                  type: t(`domain:absences.types.${ownAbsence.type}`, {
                    defaultValue: ownAbsence.type,
                  }),
                },
              )}
            </MessageBarBody>
          </MessageBar>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor={ids.title} required>
            {t('domain:calendar.form.title')}
          </Label>
          <Input
            id={ids.title}
            value={draft.title}
            disabled={readOnly}
            placeholder={t('domain:calendar.form.titlePlaceholder')}
            onChange={(_, { value }) => set({ title: value })}
          />
        </div>

        <Switch
          checked={draft.allDay}
          disabled={readOnly}
          label={t('domain:calendar.form.allDay')}
          onChange={(_, { checked }) => set({ allDay: checked })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.startDate}>{t('domain:calendar.form.startDate')}</Label>
            <DatePicker
              id={ids.startDate}
              required
              disabled={readOnly}
              aria-label={t('domain:calendar.form.startDate')}
              value={draft.startDate}
              onChange={(value) => value && set(withStart(draft, value, draft.startTime))}
            />
          </div>
          {draft.allDay ? null : (
            <div className="grid gap-2">
              <Label htmlFor={ids.startTime}>{t('domain:calendar.form.startTime')}</Label>
              <TimeInput
                id={ids.startTime}
                required
                disabled={readOnly}
                aria-label={t('domain:calendar.form.startTime')}
                value={draft.startTime}
                onChange={(value) => value && set(withStart(draft, draft.startDate, value))}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor={ids.endDate}>{t('domain:calendar.form.endDate')}</Label>
            <DatePicker
              id={ids.endDate}
              required
              disabled={readOnly}
              aria-label={t('domain:calendar.form.endDate')}
              value={draft.endDate}
              onChange={(value) => value && set(withEnd(draft, value, draft.endTime))}
            />
          </div>
          {draft.allDay ? null : (
            <div className="grid gap-2">
              <Label htmlFor={ids.endTime}>{t('domain:calendar.form.endTime')}</Label>
              <TimeInput
                id={ids.endTime}
                required
                disabled={readOnly}
                aria-label={t('domain:calendar.form.endTime')}
                value={draft.endTime}
                onChange={(value) => value && set(withEnd(draft, draft.endDate, value))}
              />
            </div>
          )}
        </div>

        {showType ? (
          <div className="grid gap-2">
            <Label>{t('domain:calendar.form.type')}</Label>
            <RadioGroup
              layout="horizontal"
              value={draft.eventType}
              disabled={readOnly || !canManageAll || Boolean(initial.occurrence?.isException)}
              onChange={(_, { value }) => set({ eventType: value as EventType })}
            >
              <Radio value="me" label={t('domain:calendar.types.me')} />
              <Radio value="all" label={t('domain:calendar.types.all')} />
            </RadioGroup>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.recurrence}>{t('domain:calendar.form.recurrence')}</Label>
            <Select
              id={ids.recurrence}
              value={draft.recurrence}
              disabled={recurrenceLocked}
              onChange={(_, { value }) =>
                set({
                  recurrence: value as RecurrenceType,
                  recurrenceUntil: value === 'none' ? '' : draft.recurrenceUntil,
                })
              }
            >
              {RECURRENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`domain:calendar.recurrence.${type}`)}
                </option>
              ))}
            </Select>
          </div>
          {draft.recurrence === 'none' ? null : (
            <div className="grid gap-2">
              <Label htmlFor={ids.until}>{t('domain:calendar.form.until')}</Label>
              <DatePicker
                id={ids.until}
                disabled={recurrenceLocked}
                aria-label={t('domain:calendar.form.until')}
                earliest={draft.startDate}
                placeholder={t('domain:calendar.form.untilNone')}
                value={draft.recurrenceUntil}
                onChange={(value) => set({ recurrenceUntil: value })}
              />
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.reminder}>{t('domain:calendar.form.reminder')}</Label>
          <Select
            id={ids.reminder}
            value={draft.reminderMinutes === null ? '' : String(draft.reminderMinutes)}
            disabled={readOnly}
            onChange={(_, { value }) =>
              set({ reminderMinutes: value === '' ? null : Number(value) })
            }
          >
            {REMINDER_OPTIONS.map((minutes) => (
              <option key={String(minutes)} value={minutes === null ? '' : String(minutes)}>
                {minutes === null
                  ? t('domain:calendar.reminder.none')
                  : minutes === 0
                    ? t('domain:calendar.reminder.atStart')
                    : t('domain:calendar.reminder.before', { minutes })}
              </option>
            ))}
          </Select>
          <p className="text-muted-foreground text-xs">{t('domain:calendar.form.reminderHint')}</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.notes}>{t('domain:calendar.form.notes')}</Label>
          <Textarea
            id={ids.notes}
            rows={4}
            disabled={readOnly}
            value={draft.description}
            onChange={(_, { value }) => set({ description: value })}
          />
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </DrawerBody>

      <FormDrawerFooter className="sm:flex-wrap">
        {editing && !readOnly ? (
          <DangerButton type="button" className="sm:mr-auto" disabled={busy} onClick={askDelete}>
            {t('domain:calendar.form.delete')}
          </DangerButton>
        ) : null}
        <Button type="button" onClick={onDone} disabled={busy}>
          {readOnly ? t('common:action.close') : t('common:action.cancel')}
        </Button>
        {readOnly ? null : (
          <Button appearance="primary" type="submit" disabled={busy}>
            {t('common:action.save')}
          </Button>
        )}
      </FormDrawerFooter>

      <Dialog open={scopeFor !== null} onOpenChange={(_, data) => !data.open && setScopeFor(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {scopeFor === 'delete'
                ? t('domain:calendar.scope.deleteTitle')
                : t('domain:calendar.scope.saveTitle')}
            </DialogTitle>
            <DialogContent>{t('domain:calendar.scope.description')}</DialogContent>
            <DialogActions fluid className="flex-wrap">
              <Button type="button" onClick={() => setScopeFor(null)}>
                {t('common:action.cancel')}
              </Button>
              {scopeFor === 'delete' ? (
                <>
                  <DangerButton type="button" onClick={() => void runDelete('this')}>
                    {t('domain:calendar.scope.this')}
                  </DangerButton>
                  <DangerButton type="button" onClick={() => void runDelete('all')}>
                    {t('domain:calendar.scope.all')}
                  </DangerButton>
                </>
              ) : (
                <>
                  <Button type="button" onClick={() => void runSave('this')}>
                    {t('domain:calendar.scope.this')}
                  </Button>
                  <Button type="button" appearance="primary" onClick={() => void runSave('all')}>
                    {t('domain:calendar.scope.all')}
                  </Button>
                </>
              )}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onOpenChange={(_, data) => !data.open && setConfirmDelete(false)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('domain:calendar.form.deleteTitle')}</DialogTitle>
            <DialogContent>
              {t('domain:calendar.form.deleteDescription', { title: draft.title.trim() })}
            </DialogContent>
            <DialogActions>
              <Button type="button" onClick={() => setConfirmDelete(false)}>
                {t('common:action.cancel')}
              </Button>
              <DangerButton type="button" onClick={() => void runDelete('all')}>
                {t('domain:calendar.form.deleteConfirm')}
              </DangerButton>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </form>
  );
}
