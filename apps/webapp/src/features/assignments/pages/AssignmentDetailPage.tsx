import { cn, DangerButton } from '@bautakt/ui';
import {
  Button,
  Card,
  CardHeader,
  Link as FluentLink,
  makeStyles,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  CalendarRegular,
  ClockRegular,
  DeleteRegular,
  EditRegular,
  LocationRegular,
  PeopleAddRegular,
} from '@fluentui/react-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { localIsoDay, startOfWeek } from '@/features/calendar/calendarModel';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { MemberAvatar } from '@/features/overview/components/CrewAvatars';
import { useAbsences } from '@/features/team/useAbsences';
import { useProfileImageUrls } from '@/features/team/useProfileImageUrls';
import { formatDate, formatDateTime, formatTime } from '@/lib/format';
import { routes } from '@/lib/routes';

import { absenceConflict } from '../absenceConflict';
import { AssignmentDeleteDialog } from '../AssignmentDeleteDialog';
import { AssignmentSheet } from '../AssignmentSheet';
import { type AssignmentDetail, useAssignment } from '../useAssignment';

const useStyles = makeStyles({
  pending: { color: tokens.colorPaletteMarigoldForeground2 },
});

const longDate = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function sameLocalDay(a: Date, b: Date): boolean {
  return localIsoDay(a) === localIsoDay(b);
}

/** „Mo., 13. Oktober 2026 · 07:00–16:00“ bzw. über mehrere Tage beide Zeitpunkte. */
function periodHeading(startsAt: string, endsAt: string): { date: string; time: string } {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (sameLocalDay(start, end)) {
    return { date: longDate.format(start), time: `${formatTime(startsAt)}–${formatTime(endsAt)}` };
  }
  return {
    date: longDate.format(start),
    time: `${formatTime(startsAt)} – ${longDate.format(end)}, ${formatTime(endsAt)}`,
  };
}

/** Dauer in Stunden, eine Nachkommastelle, ohne „,0“. */
function durationHours(startsAt: string, endsAt: string): string {
  const hours = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 3_600_000;
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(hours);
}

export function AssignmentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const canManage = usePermission('canManageWorkAssignments');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const assignment = useAssignment(id);
  const { data, isError, refetch } = assignment;
  const isLoading = useCompanyListLoading(assignment);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:assignments.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:assignments.detailTitle')} />
        <EmptyState
          title={t('domain:assignments.loadErrorTitle')}
          description={t('domain:assignments.loadErrorDescription')}
          action={
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:assignments.detailTitle')} />
        <EmptyState
          title={t('domain:assignments.notFoundTitle')}
          description={t('domain:assignments.notFoundDescription')}
          action={<LinkButton to={routes.assignments}>{t('common:action.back')}</LinkButton>}
        />
      </div>
    );
  }

  return (
    <>
      <AssignmentView
        assignment={data}
        canManage={canManage}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />
      {canManage ? (
        <>
          <AssignmentSheet open={editOpen} onOpenChange={setEditOpen} assignment={data} />
          <AssignmentDeleteDialog
            assignment={data}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      ) : null}
    </>
  );
}

function AssignmentView({
  assignment,
  canManage,
  onEdit,
  onDelete,
}: {
  assignment: AssignmentDetail;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const canOpenEmployees = usePermission('canManageEmployees');
  const styles = useStyles();
  const absences = useAbsences().data ?? [];
  const startDay = localIsoDay(new Date(assignment.starts_at));
  const endDay = localIsoDay(new Date(assignment.ends_at));
  const urls = useProfileImageUrls(assignment.crew.map((member) => member.imagePath)).data ?? {};
  const { date, time } = periodHeading(assignment.starts_at, assignment.ends_at);
  const weekOf = startOfWeek(localIsoDay(new Date(assignment.starts_at)));
  const orderName = assignment.order_name.trim() || t('domain:assignments.noOrder');
  const note = assignment.note.trim();
  const created = assignment.created_by_name
    ? t('domain:assignments.detail.createdBy', {
        date: formatDateTime(assignment.created_at),
        name: assignment.created_by_name,
      })
    : formatDateTime(assignment.created_at);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {/* Auftrag klein darüber, Datum und Uhrzeit groß: auf dieser Seite geht
              es um den Termin, der Auftrag ist der Kontext (Owner-Vorgabe). */}
          <Link
            to={routes.order(assignment.order_id)}
            className="text-muted-foreground hover:text-foreground w-fit text-sm font-medium break-words underline-offset-4 hover:underline"
          >
            {orderName}
          </Link>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {t('domain:assignments.detail.heading', { date })}
            <span aria-hidden> · </span>
            <span className="tabular-nums">{time}</span>
          </h1>
          {assignment.order_location ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <LocationRegular aria-hidden fontSize={16} />
              {assignment.order_location}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Zurück in die Woche des Einsatzes, nicht in die aktuelle. */}
          <LinkButton to={`${routes.assignments}?woche=${weekOf}`}>
            {t('common:action.back')}
          </LinkButton>
          {canManage ? (
            <>
              <Button appearance="primary" icon={<EditRegular />} onClick={onEdit}>
                {t('domain:assignments.edit.action')}
              </Button>
              <DangerButton onClick={onDelete} icon={<DeleteRegular />}>
                {t('domain:assignments.delete.action')}
              </DangerButton>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section
            title={`${t('domain:assignments.detail.crewTitle')} (${assignment.crew.length})`}
          >
            {assignment.crew.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-muted-foreground text-sm">
                  {t('domain:assignments.detail.noCrew')}
                </p>
                {canManage ? (
                  <Button icon={<PeopleAddRegular />} onClick={onEdit}>
                    {t('domain:assignments.detail.assignCrew')}
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {assignment.crew.map((member) => {
                  // Altfälle: eingeteilt, obwohl inzwischen (oder schon vorher)
                  // abwesend. Neu einteilen sperrt die Datenbank.
                  const { approved, pending } = absenceConflict(
                    absences,
                    member.employmentId,
                    startDay,
                    endDay,
                  );
                  const absence = approved ?? pending;
                  const content = (
                    <>
                      <MemberAvatar member={member} urls={urls} size={56} />
                      <span className="text-foreground line-clamp-2 text-center text-sm font-medium">
                        {member.name || t('domain:assignments.unnamedEmployee')}
                      </span>
                      {absence ? (
                        <span
                          className={cn(
                            'text-center text-xs',
                            approved ? 'text-destructive font-medium' : styles.pending,
                          )}
                        >
                          {t(
                            approved
                              ? 'domain:assignments.absence.onTile'
                              : 'domain:assignments.absence.onTilePending',
                            {
                              type: t(`domain:absences.types.${absence.type}`, {
                                defaultValue: absence.type,
                              }),
                            },
                          )}
                        </span>
                      ) : null}
                    </>
                  );
                  const tile = cn(
                    'border-border flex flex-col items-center gap-2 rounded-lg border px-3 py-4',
                    approved && 'border-destructive',
                  );
                  return (
                    <li key={member.employmentId}>
                      {canOpenEmployees ? (
                        <Link
                          to={routes.employee(member.employmentId)}
                          className={`${tile} hover:bg-surface transition-colors`}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className={tile}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title={t('domain:assignments.detail.notesTitle')}>
            {note ? (
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{note}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('domain:assignments.detail.noNote')}
              </p>
            )}
          </Section>
        </div>

        <Section title={t('domain:assignments.detail.infoTitle')}>
          <dl className="flex flex-col gap-4">
            <Fact icon={<CalendarRegular />} label={t('domain:assignments.detail.date')}>
              {sameLocalDay(new Date(assignment.starts_at), new Date(assignment.ends_at))
                ? formatDate(assignment.starts_at)
                : `${formatDate(assignment.starts_at)} – ${formatDate(assignment.ends_at)}`}
            </Fact>
            <Fact icon={<ClockRegular />} label={t('domain:assignments.detail.time')}>
              {formatTime(assignment.starts_at)}–{formatTime(assignment.ends_at)}
              <span className="text-muted-foreground">
                {' · '}
                {t('domain:assignments.detail.durationValue', {
                  hours: durationHours(assignment.starts_at, assignment.ends_at),
                })}
              </span>
            </Fact>
            <Fact icon={<EditRegular />} label={t('domain:assignments.detail.created')}>
              {created}
            </Fact>
          </dl>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="large" className="h-fit">
      <CardHeader
        header={
          <Text as="h2" size={400} weight="semibold">
            {title}
          </Text>
        }
      />
      {children}
    </Card>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex shrink-0 text-base" aria-hidden>
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="text-foreground text-sm tabular-nums">{children}</dd>
      </div>
    </div>
  );
}
