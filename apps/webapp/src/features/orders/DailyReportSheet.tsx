import { hasPermission } from '@bautakt/core';
import {
  Badge,
  Button,
  Checkbox,
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
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismissLock } from '@/components/common/useDismissLock';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';

import { canBookReportTime } from './dailyReportAccess';
import { DailyReportDeleteDialog } from './DailyReportDeleteDialog';
import {
  type DailyReportAttendance,
  type DailyReportDraft,
  type DailyReportIssue,
  dailyReportIssue,
  emptyAttendance,
} from './dailyReportDraft';
import { DailyReportDuplicateDateError, useSaveDailyReport } from './useDailyReportMutations';
import { formatReportDate, type ReportStaff } from './useOrderDailyReports';
import { weatherChoices } from './weatherOptions';

const ISSUE_KEY = {
  date: 'domain:dailyReportForm.dateRequired',
  weatherMorning: 'domain:dailyReportForm.weatherMorningRequired',
  weatherAfternoon: 'domain:dailyReportForm.weatherAfternoonRequired',
  temperatureMorning: 'domain:dailyReportForm.temperatureMorningRequired',
  temperatureAfternoon: 'domain:dailyReportForm.temperatureAfternoonRequired',
  attendance: 'domain:dailyReportForm.attendanceRequired',
  time: 'domain:dailyReportForm.timeRequired',
  workDone: 'domain:dailyReportForm.workDoneRequired',
} as const satisfies Record<DailyReportIssue, string>;

/**
 * Bautagebuch anlegen oder bearbeiten.
 *
 * Das Panel ist nur gemountet, solange es offen ist, und startet deshalb
 * jedes Mal mit dem übergebenen Entwurf. Von/Bis erscheint nur für Personen,
 * deren Zeit dieses Konto buchen darf. Solange Speichern oder Löschen läuft,
 * bleibt es offen: Fokus, Escape und ein Klick daneben schließen es nicht.
 */
export function DailyReportSheet({
  draft,
  open,
  onOpenChange,
  staff,
  staffError,
  staffPending,
  onOpenExisting,
}: {
  draft: DailyReportDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: ReportStaff[];
  staffError: boolean;
  staffPending: boolean;
  onOpenExisting: (reportId: string) => boolean;
}) {
  const dismiss = useDismissLock(onOpenChange);
  return (
    <Sheet open={open} onOpenChange={dismiss.handleOpenChange}>
      <SheetContent className="p-0">
        {open && draft ? (
          <DailyReportForm
            key={draft.id ?? 'new'}
            initial={draft}
            staff={staff}
            staffError={staffError}
            staffPending={staffPending}
            onOpenExisting={onOpenExisting}
            onBusyChange={dismiss.onBusyChange}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DailyReportForm({
  initial,
  staff,
  staffError,
  staffPending,
  onOpenExisting,
  onBusyChange,
  onDone,
}: {
  initial: DailyReportDraft;
  staff: ReportStaff[];
  staffError: boolean;
  staffPending: boolean;
  onOpenExisting: (reportId: string) => boolean;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const save = useSaveDailyReport();
  const [draft, setDraft] = useState(initial);
  const [revealIssues, setRevealIssues] = useState(false);
  const [revealPulse, setRevealPulse] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [duplicateDenied, setDuplicateDenied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLFieldSetElement>(null);
  const workRef = useRef<HTMLDivElement>(null);
  const ids = {
    date: useId(),
    temperatureMorning: useId(),
    temperatureAfternoon: useId(),
    workDone: useId(),
    notes: useId(),
  };

  const canTeam = hasPermission(membership?.permissions, 'canTrackTimeForTeam');
  const canOwn = hasPermission(membership?.permissions, 'canTrackTime');
  const offersTime = canTeam || canOwn;
  const busy = save.isPending || deletePending;

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    return () => onBusyChange(false);
  }, [onBusyChange]);

  function bookable(employmentId: string): boolean {
    const person = staff.find((entry) => entry.id === employmentId);
    if (!person) return false;
    return canBookReportTime(membership?.permissions, user?.id, { userId: person.userId });
  }

  const issue = revealIssues ? dailyReportIssue(draft, bookable) : null;
  const fieldError = issue ? t(ISSUE_KEY[issue]) : null;
  const error = fieldError ?? saveError;

  useEffect(() => {
    if (!error) return;
    const target =
      issue === 'workDone'
        ? workRef
        : issue === 'attendance' || issue === 'time'
          ? attendanceRef
          : dateRef;
    target.current?.scrollIntoView({ block: 'center' });
  }, [error, issue, revealPulse]);

  const active = staff.filter((person) => !person.endedAt);
  const selectedEnded = staff.filter(
    (person) => person.endedAt && draft.attendance.some((row) => row.employmentId === person.id),
  );
  const selectable = [...active, ...selectedEnded].sort((a, b) =>
    a.name.localeCompare(b.name, 'de'),
  );

  function set(patch: Partial<DailyReportDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveError(null);
    setDuplicateId(null);
    setDuplicateDenied(false);
  }

  function togglePerson(employmentId: string, on: boolean) {
    setDraft((current) => ({
      ...current,
      attendance: on
        ? current.attendance.some((row) => row.employmentId === employmentId)
          ? current.attendance
          : [...current.attendance, emptyAttendance(employmentId)]
        : current.attendance.filter((row) => row.employmentId !== employmentId),
    }));
    setSaveError(null);
    setDuplicateId(null);
    setDuplicateDenied(false);
  }

  function setTime(
    employmentId: string,
    patch: Partial<Pick<DailyReportAttendance, 'startTime' | 'endTime'>>,
  ) {
    setDraft((current) => ({
      ...current,
      attendance: current.attendance.map((row) =>
        row.employmentId === employmentId ? { ...row, ...patch } : row,
      ),
    }));
    setSaveError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextIssue = dailyReportIssue(draft, bookable);
    if (nextIssue) {
      setRevealIssues(true);
      setRevealPulse((value) => value + 1);
      setSaveError(null);
      setDuplicateId(null);
      return;
    }
    setRevealIssues(false);

    try {
      const result = await save.mutateAsync(draft);
      const names = result.billedEmploymentIds
        .map((id) => staff.find((person) => person.id === id)?.name)
        .filter((name): name is string => Boolean(name));
      toast.success(t('domain:dailyReportForm.saved'), {
        description: names.length
          ? t('domain:dailyReportForm.billedKept', { names: names.join(', ') })
          : undefined,
      });
      onDone();
    } catch (caught) {
      setRevealPulse((value) => value + 1);
      if (caught instanceof DailyReportDuplicateDateError) {
        setDuplicateId(caught.existingId);
        setDuplicateDenied(false);
        setSaveError(t('domain:dailyReportForm.duplicate'));
        return;
      }
      setDuplicateId(null);
      setSaveError(readableDbError(caught) ?? t('domain:dailyReportForm.saveError'));
    }
  }

  function openExisting() {
    if (!duplicateId) return;
    const opened = onOpenExisting(duplicateId);
    setDuplicateDenied(!opened);
  }

  const attendanceHint = canTeam
    ? t('domain:dailyReportForm.attendanceHintTeam')
    : canOwn
      ? t('domain:dailyReportForm.attendanceHintOwn')
      : t('domain:dailyReportForm.attendanceHintNone');

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>
          {draft.id ? t('domain:dailyReportForm.editTitle') : t('domain:dailyReportForm.newTitle')}
        </SheetTitle>
        <SheetDescription>{t('domain:dailyReportForm.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <div ref={dateRef} className="grid gap-2">
          <Label htmlFor={ids.date}>{t('domain:dailyReportForm.date')}</Label>
          <Input
            id={ids.date}
            type="date"
            required
            value={draft.date}
            onChange={(event) => set({ date: event.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <WeatherField
            label={t('domain:dailyReportForm.weatherMorning')}
            value={draft.weatherMorning}
            onChange={(weatherMorning) => set({ weatherMorning })}
          />
          <TemperatureField
            id={ids.temperatureMorning}
            label={t('domain:dailyReportForm.temperatureMorning')}
            value={draft.temperatureMorning}
            onChange={(temperatureMorning) => set({ temperatureMorning })}
          />
          <WeatherField
            label={t('domain:dailyReportForm.weatherAfternoon')}
            value={draft.weatherAfternoon}
            onChange={(weatherAfternoon) => set({ weatherAfternoon })}
          />
          <TemperatureField
            id={ids.temperatureAfternoon}
            label={t('domain:dailyReportForm.temperatureAfternoon')}
            value={draft.temperatureAfternoon}
            onChange={(temperatureAfternoon) => set({ temperatureAfternoon })}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          {t('domain:dailyReportForm.temperatureHint')}
        </p>

        <fieldset ref={attendanceRef} className="grid gap-2">
          <legend className="text-sm leading-none font-medium">
            {t('domain:dailyReportForm.attendance')}
          </legend>
          <p className="text-muted-foreground text-sm">{attendanceHint}</p>
          {staffPending ? (
            <p className="text-muted-foreground text-sm">{t('common:state.loading')}</p>
          ) : staffError ? (
            <p className="text-destructive text-sm">{t('domain:dailyReportForm.employeesError')}</p>
          ) : selectable.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('domain:dailyReportForm.noEmployees')}
            </p>
          ) : (
            <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
              {selectable.map((person) => {
                const row = draft.attendance.find((entry) => entry.employmentId === person.id);
                const showTime = Boolean(row) && bookable(person.id);
                return (
                  <div key={person.id} className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(row)}
                        onCheckedChange={(value) => togglePerson(person.id, value === true)}
                      />
                      <span className="text-foreground">
                        {person.endedAt
                          ? t('domain:dailyReportForm.ended', {
                              name: person.name || t('domain:employees.unnamed'),
                            })
                          : person.name || t('domain:employees.unnamed')}
                      </span>
                      {row?.billed ? (
                        <Badge variant="muted">{t('domain:dailyReportForm.billed')}</Badge>
                      ) : null}
                    </label>
                    {showTime && row?.billed ? (
                      <p className="text-muted-foreground pl-6 text-xs">
                        {row.startTime && row.endTime ? `${row.startTime}–${row.endTime} · ` : ''}
                        {t('domain:dailyReportForm.billedTime')}
                      </p>
                    ) : null}
                    {showTime && row && !row.billed ? (
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        <div className="grid gap-1">
                          <Label className="text-xs">{t('domain:dailyReportForm.start')}</Label>
                          <Input
                            type="time"
                            value={row.startTime}
                            onChange={(event) =>
                              setTime(person.id, { startTime: event.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">{t('domain:dailyReportForm.end')}</Label>
                          <Input
                            type="time"
                            value={row.endTime}
                            onChange={(event) =>
                              setTime(person.id, { endTime: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {offersTime ? (
            <p className="text-muted-foreground text-xs">
              {t('domain:dailyReportForm.overnightHint')}
            </p>
          ) : null}
        </fieldset>

        <div ref={workRef} className="grid gap-2">
          <Label htmlFor={ids.workDone}>{t('domain:dailyReportForm.workDone')}</Label>
          <Textarea
            id={ids.workDone}
            rows={4}
            value={draft.workDone}
            onChange={(event) => set({ workDone: event.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.notes}>{t('domain:dailyReportForm.notes')}</Label>
          <Textarea
            id={ids.notes}
            rows={3}
            value={draft.notes}
            onChange={(event) => set({ notes: event.target.value })}
          />
        </div>

        {draft.id ? (
          <Button
            type="button"
            variant="destructive"
            className="w-fit"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            {t('domain:dailyReportForm.delete.action')}
          </Button>
        ) : null}
      </SheetBody>

      <SheetFooter className="sm:flex-col sm:items-stretch">
        {error ? (
          <div role="alert" className="flex flex-col items-start gap-1">
            <p className="text-destructive text-sm">{error}</p>
            {duplicateId ? (
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={openExisting}
              >
                {t('domain:dailyReportForm.openExisting')}
              </button>
            ) : null}
            {duplicateDenied ? (
              <p className="text-muted-foreground text-sm">
                {t('domain:dailyReportForm.openExistingDenied')}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
            {t('common:action.cancel')}
          </Button>
          <Button type="submit" disabled={busy || staffPending || staffError}>
            {save.isPending ? t('domain:dailyReportForm.saving') : t('common:action.save')}
          </Button>
        </div>
      </SheetFooter>

      {draft.id ? (
        <DailyReportDeleteDialog
          reportId={draft.id}
          dateLabel={formatReportDate(draft.date)}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onPendingChange={setDeletePending}
          onDeleted={onDone}
        />
      ) : null}
    </form>
  );
}

function WeatherField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const choices = weatherChoices(value);
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('domain:dailyReportForm.chooseWeather')} />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice} value={choice}>
              {choice}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TemperatureField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        className="tabular-nums"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
