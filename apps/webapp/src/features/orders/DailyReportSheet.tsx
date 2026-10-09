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
import { DatePicker, TimeInput } from '@/components/form/dateTime';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';

import { canBookReportTime, canDeleteDailyReport } from './dailyReportAccess';
import { DailyReportDeleteDialog } from './DailyReportDeleteDialog';
import {
  type DailyReportAttendance,
  type DailyReportDraft,
  type DailyReportIssue,
  dailyReportIssue,
  emptyAttendance,
} from './dailyReportDraft';
import { DailyReportDuplicateDateError, useSaveDailyReport } from './useDailyReportMutations';
import {
  formatReportDate,
  otherDailyReportId,
  type ReportStaff,
  useDailyReportOnDate,
} from './useOrderDailyReports';
import { weatherChoices } from './weatherOptions';

export type OpenDailyReportResult = 'opened' | 'denied' | 'missing';

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
 *
 * Ein belegtes Datum zeigt den Hinweis sofort, nicht erst nach dem Speichern.
 * Die eigene Anwesenheit kommt erst, wenn die Mitarbeiter geladen sind, und
 * nur solange der Nutzer die Auswahl nicht selbst geändert hat.
 */
export function DailyReportSheet({
  draft,
  open,
  onOpenChange,
  reports,
  staff,
  staffError,
  staffPending,
  onOpenExisting,
}: {
  draft: DailyReportDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: readonly { id: string; date: string }[];
  staff: ReportStaff[];
  staffError: boolean;
  staffPending: boolean;
  onOpenExisting: (reportId: string) => OpenDailyReportResult | Promise<OpenDailyReportResult>;
}) {
  const dismiss = useDismissLock(onOpenChange);
  return (
    <Sheet open={open} onOpenChange={dismiss.handleOpenChange}>
      <SheetContent className="p-0">
        {open && draft ? (
          <DailyReportForm
            key={draft.id ?? 'new'}
            initial={draft}
            reports={reports}
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
  reports,
  staff,
  staffError,
  staffPending,
  onOpenExisting,
  onBusyChange,
  onDone,
}: {
  initial: DailyReportDraft;
  reports: readonly { id: string; date: string }[];
  staff: ReportStaff[];
  staffError: boolean;
  staffPending: boolean;
  onOpenExisting: (reportId: string) => OpenDailyReportResult | Promise<OpenDailyReportResult>;
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
  const [forcedDuplicate, setForcedDuplicate] = useState<{
    date: string;
    id: string | null;
  } | null>(null);
  const [deniedOnDate, setDeniedOnDate] = useState<string | null>(null);
  const [openingExisting, setOpeningExisting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [attendanceTouched, setAttendanceTouched] = useState(false);
  const [appliedStaffKey, setAppliedStaffKey] = useState<string | null>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLFieldSetElement>(null);
  const workRef = useRef<HTMLDivElement>(null);
  const ids = {
    date: useId(),
    temperatureMorning: useId(),
    temperatureAfternoon: useId(),
    workDone: useId(),
    notes: useId(),
    duplicate: useId(),
  };

  const dateProbe = useDailyReportOnDate(draft.orderId, draft.date);
  const localDuplicateId = otherDailyReportId(reports, draft.date, draft.id);
  const serverDuplicateId = dateProbe.isSuccess
    ? (dateProbe.data.find((id) => id !== draft.id) ?? null)
    : null;
  // Solange die Abfrage läuft, gilt die geladene Liste — sonst verschwindet
  // der Hinweis, obwohl die Karte den Bericht schon zeigt. Danach gilt der
  // Server, auch für Berichte, die in der Liste noch fehlen.
  const liveDuplicateId =
    dateProbe.isSuccess && !dateProbe.isFetching
      ? serverDuplicateId
      : (localDuplicateId ?? serverDuplicateId);
  const forced = forcedDuplicate && forcedDuplicate.date === draft.date ? forcedDuplicate : null;
  const duplicate = Boolean(forced) || Boolean(liveDuplicateId);
  const duplicateId = forced?.id ?? liveDuplicateId;
  const duplicateDenied = deniedOnDate === draft.date && duplicate;

  // Vorauswahl erst, wenn die Mitarbeiter da sind. Während des Renderns,
  // nicht im Effekt: die Auswahl hängt an Daten, die nach dem Öffnen ankommen.
  const staffReady =
    !initial.id && !staffPending && !staffError && Boolean(membership?.employmentId);
  const staffKey = staffReady
    ? `${membership?.employmentId}|${staff.map((person) => `${person.id}:${person.endedAt ?? ''}`).join('|')}`
    : '';
  if (staffReady && !attendanceTouched && staffKey !== appliedStaffKey) {
    setAppliedStaffKey(staffKey);
    const own = staff.find((person) => person.id === membership?.employmentId && !person.endedAt);
    const next = own ? [emptyAttendance(own.id)] : [];
    setDraft((current) => {
      if (current.id || attendanceTouched) return current;
      if (sameAttendance(current.attendance, next)) return current;
      return { ...current, attendance: next };
    });
  }

  const canTeam = hasPermission(membership?.permissions, 'canTrackTimeForTeam');
  const canOwn = hasPermission(membership?.permissions, 'canTrackTime');
  const offersTime = canTeam || canOwn;
  const canDelete = draft.authorUserId
    ? canDeleteDailyReport(membership?.permissions, user?.id, { userId: draft.authorUserId })
    : false;
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
  }

  function togglePerson(employmentId: string, on: boolean) {
    setAttendanceTouched(true);
    setDraft((current) => ({
      ...current,
      attendance: on
        ? current.attendance.some((row) => row.employmentId === employmentId)
          ? current.attendance
          : [...current.attendance, emptyAttendance(employmentId)]
        : current.attendance.filter((row) => row.employmentId !== employmentId),
    }));
    setSaveError(null);
  }

  function setTime(
    employmentId: string,
    patch: Partial<Pick<DailyReportAttendance, 'startTime' | 'endTime'>>,
  ) {
    setAttendanceTouched(true);
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
    if (duplicate) return;
    const nextIssue = dailyReportIssue(draft, bookable);
    if (nextIssue) {
      setRevealIssues(true);
      setRevealPulse((value) => value + 1);
      setSaveError(null);
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
        setForcedDuplicate({ date: draft.date, id: caught.existingId });
        setDeniedOnDate(null);
        setSaveError(null);
        return;
      }
      setSaveError(readableDbError(caught) ?? t('domain:dailyReportForm.saveError'));
    }
  }

  async function openExisting() {
    if (!duplicateId || openingExisting) return;
    setOpeningExisting(true);
    setDeniedOnDate(null);
    try {
      const result = await onOpenExisting(duplicateId);
      if (result === 'denied') setDeniedOnDate(draft.date);
    } finally {
      setOpeningExisting(false);
    }
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
          <DatePicker
            id={ids.date}
            required
            requiredMessage={t('domain:dailyReportForm.dateRequired')}
            value={draft.date}
            aria-label={t('domain:dailyReportForm.date')}
            aria-invalid={duplicate || undefined}
            aria-describedby={duplicate ? ids.duplicate : undefined}
            onChange={(date) => set({ date })}
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
                          <Label htmlFor={`${person.id}-start`} className="text-xs">
                            {t('domain:dailyReportForm.start')}
                          </Label>
                          <TimeInput
                            id={`${person.id}-start`}
                            aria-label={`${person.name || t('domain:employees.unnamed')}: ${t('domain:dailyReportForm.start')}`}
                            value={row.startTime}
                            onChange={(startTime) => setTime(person.id, { startTime })}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`${person.id}-end`} className="text-xs">
                            {t('domain:dailyReportForm.end')}
                          </Label>
                          <TimeInput
                            id={`${person.id}-end`}
                            aria-label={`${person.name || t('domain:employees.unnamed')}: ${t('domain:dailyReportForm.end')}`}
                            value={row.endTime}
                            onChange={(endTime) => setTime(person.id, { endTime })}
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
      </SheetBody>

      <SheetFooter className="sm:flex-col sm:items-stretch">
        {duplicate ? (
          <div id={ids.duplicate} role="alert" className="flex flex-col items-start gap-1">
            <p className="text-destructive text-sm">{t('domain:dailyReportForm.duplicate')}</p>
            {duplicateId ? (
              <button
                type="button"
                className="text-primary text-sm font-medium hover:underline disabled:opacity-50"
                disabled={openingExisting}
                onClick={() => void openExisting()}
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
        {error && !duplicate ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {draft.id && canDelete ? (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              {t('domain:dailyReportForm.delete.action')}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
            {t('common:action.cancel')}
          </Button>
          <Button type="submit" disabled={busy || staffPending || staffError || duplicate}>
            {save.isPending ? t('domain:dailyReportForm.saving') : t('common:action.save')}
          </Button>
        </div>
      </SheetFooter>

      {draft.id && canDelete ? (
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

function sameAttendance(left: DailyReportAttendance[], right: DailyReportAttendance[]): boolean {
  if (left.length !== right.length) return false;
  return left.every(
    (row, index) =>
      row.employmentId === right[index]?.employmentId &&
      row.startTime === right[index]?.startTime &&
      row.endTime === right[index]?.endTime &&
      row.billed === right[index]?.billed,
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
