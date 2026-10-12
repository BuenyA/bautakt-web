import { daysBetween } from '@bautakt/finance';
import { DeleteButton, StatusBadge, toast } from '@bautakt/ui';
import { Button, Card, CardHeader, Link as FluentLink, Text } from '@fluentui/react-components';
import {
  CalendarRegular,
  CheckmarkRegular,
  DismissCircleRegular,
  DismissRegular,
  EditRegular,
  PersonRegular,
  TimerRegular,
} from '@fluentui/react-icons';
import { useIsMutating } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { MemberAvatar } from '@/features/overview/components/CrewAvatars';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate, formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';

import { type AbsenceAction, AbsenceActionDialog } from '../AbsenceActionDialog';
import { AbsenceSheet } from '../AbsenceSheet';
import { absenceStatusTone, PENDING_STATUS } from '../absenceValues';
import {
  type AbsenceDetail,
  DELETE_ABSENCE_KEY,
  useAbsence,
  useApproveAbsence,
} from '../useAbsences';
import { useProfileImageUrls } from '../useProfileImageUrls';

/**
 * Eine Abwesenheit: wen sie betrifft, wann, und was sich daran noch tun lässt.
 *
 * Bearbeiten geht bei offenen und genehmigten — auch rückwirkend, etwa wenn
 * aus Urlaub nachträglich Krankheit wird. Die Grenzen zieht der Trigger
 * `enforce_absence_update_integrity` (bautakt-app `20261011213845`).
 */
export function AbsenceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const absence = useAbsence(id);
  const { data, isError, refetch } = absence;
  const isLoading = useCompanyListLoading(absence);
  // Nach dem Löschen lädt die Seite einmal ins Leere, bevor es zurückgeht.
  const deleting = useIsMutating({ mutationKey: DELETE_ABSENCE_KEY }) > 0;
  const [editOpen, setEditOpen] = useState(false);
  const [action, setAction] = useState<AbsenceAction | null>(null);

  if (isLoading || (!data && deleting)) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:absences.detail.title')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:absences.detail.title')} />
        <EmptyState
          title={t('domain:absences.detail.loadErrorTitle')}
          description={t('domain:absences.detail.loadErrorDescription')}
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
        <PageHeader title={t('domain:absences.detail.title')} />
        <EmptyState
          title={t('domain:absences.detail.notFoundTitle')}
          description={t('domain:absences.detail.notFoundDescription')}
          action={<LinkButton to={routes.absences}>{t('common:action.back')}</LinkButton>}
        />
      </div>
    );
  }

  return (
    <>
      <AbsenceView
        absence={data}
        onEdit={() => setEditOpen(true)}
        onAction={(next) => setAction(next)}
      />
      <AbsenceSheet open={editOpen} onOpenChange={setEditOpen} absence={data} />
      <AbsenceActionDialog
        action={action}
        absence={{
          id: data.id,
          name: data.employee_name,
          type: data.type,
          startDate: data.start_date,
          endDate: data.end_date,
        }}
        onClose={() => setAction(null)}
        onDone={(done) => {
          if (done === 'delete') void navigate(routes.absences, { replace: true });
        }}
      />
    </>
  );
}

function AbsenceView({
  absence,
  onEdit,
  onAction,
}: {
  absence: AbsenceDetail;
  onEdit: () => void;
  onAction: (action: AbsenceAction) => void;
}) {
  const { t } = useTranslation();
  const canOpenEmployees = usePermission('canManageEmployees');
  const approve = useApproveAbsence();
  const urls = useProfileImageUrls([absence.member.imagePath]).data ?? {};
  const isPending = absence.status === PENDING_STATUS;
  const editable = isPending || absence.status === 'genehmigt';
  const name = absence.employee_name || t('domain:employees.unnamed');
  const typeLabel = t(`domain:absences.types.${absence.type}`, { defaultValue: absence.type });
  const days = daysBetween(absence.start_date, absence.end_date) + 1;
  const note = absence.note.trim();

  async function onApprove() {
    try {
      await approve.mutateAsync(absence.id);
      toast.success(t('domain:absences.approved'));
    } catch (error) {
      toast.error(t('domain:absences.approveError'), {
        description: readableDbError(error) ?? undefined,
      });
    }
  }

  const person = (
    <>
      <MemberAvatar member={absence.member} urls={urls} size={64} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-muted-foreground text-sm font-medium">{name}</span>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight break-words sm:text-3xl">
          {typeLabel}
        </h1>
      </span>
    </>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          {/* Die Person vorn, wie die Gesichter in der Einsatzplanung; mit Recht
              führt sie zum Mitarbeiter. */}
          {canOpenEmployees ? (
            <Link
              to={routes.employee(absence.employment_id)}
              aria-label={`${name} · ${t('domain:absences.detail.toEmployee')}`}
              className="hover:bg-surface -m-2 flex w-fit items-center gap-4 rounded-lg p-2 transition-colors"
            >
              {person}
            </Link>
          ) : (
            <div className="flex items-center gap-4">{person}</div>
          )}
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={absenceStatusTone(absence.status)}>
              {t(`domain:absences.status.${absence.status}`, { defaultValue: absence.status })}
            </StatusBadge>
            <span className="text-muted-foreground text-sm tabular-nums">
              {formatDate(absence.start_date)}
              {absence.start_date === absence.end_date ? null : (
                <> – {formatDate(absence.end_date)}</>
              )}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <LinkButton to={routes.absences}>{t('common:action.back')}</LinkButton>
          {editable ? (
            <Button appearance="primary" icon={<EditRegular />} onClick={onEdit}>
              {t('domain:absences.edit')}
            </Button>
          ) : null}
          {absence.status === 'genehmigt' ? (
            <Button icon={<DismissCircleRegular />} onClick={() => onAction('cancel')}>
              {t('domain:absences.cancelAction')}
            </Button>
          ) : null}
          <DeleteButton label={t('domain:absences.delete')} onClick={() => onAction('delete')} />
        </div>
      </div>

      {editable ? null : (
        <p className="text-muted-foreground -mt-4 text-sm">{t('domain:absences.detail.locked')}</p>
      )}

      {/* Die Entscheidung steht für sich, nicht zwischen Zurück, Bearbeiten
          und Löschen (Owner-Wunsch). */}
      {isPending ? (
        <Card size="large">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <Text as="h2" size={400} weight="semibold">
                {t('domain:absences.detail.decisionTitle')}
              </Text>
              <Text size={300} className="text-muted-foreground">
                {t('domain:absences.detail.decisionHint')}
              </Text>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button icon={<DismissRegular />} onClick={() => onAction('reject')}>
                {t('domain:absences.reject')}
              </Button>
              <Button
                appearance="primary"
                icon={<CheckmarkRegular />}
                disabled={approve.isPending}
                onClick={() => void onApprove()}
              >
                {t('domain:absences.approve')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Section title={t('domain:absences.detail.noteTitle')}>
          <div className="flex flex-col gap-4">
            {note ? (
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{note}</p>
            ) : (
              <p className="text-muted-foreground text-sm">{t('domain:absences.detail.noNote')}</p>
            )}
            {absence.status === 'abgelehnt' && absence.decision_note ? (
              <div className="flex flex-col gap-1">
                <Text size={200} className="text-muted-foreground">
                  {t('domain:absences.detail.decisionNote')}
                </Text>
                <p className="text-foreground text-sm whitespace-pre-wrap">
                  {absence.decision_note}
                </p>
              </div>
            ) : null}
          </div>
        </Section>

        <Section title={t('domain:absences.detail.infoTitle')}>
          <dl className="flex flex-col gap-4">
            <Fact icon={<CalendarRegular />} label={t('domain:absences.detail.period')}>
              {absence.start_date === absence.end_date
                ? formatDate(absence.start_date)
                : `${formatDate(absence.start_date)} – ${formatDate(absence.end_date)}`}
            </Fact>
            <Fact icon={<TimerRegular />} label={t('domain:absences.detail.days')}>
              {t('domain:absences.detail.daysValue', { count: days })}
            </Fact>
            <Fact icon={<PersonRegular />} label={t('domain:absences.detail.requested')}>
              {absence.requested_by_name
                ? t('domain:absences.detail.requestedBy', {
                    date: formatDateTime(absence.created_at),
                    name: absence.requested_by_name,
                  })
                : formatDateTime(absence.created_at)}
            </Fact>
            {absence.decided_at ? (
              <Fact icon={<CheckmarkRegular />} label={t('domain:absences.detail.decided')}>
                {absence.decided_by_name
                  ? t('domain:absences.detail.requestedBy', {
                      date: formatDateTime(absence.decided_at),
                      name: absence.decided_by_name,
                    })
                  : formatDateTime(absence.decided_at)}
              </Fact>
            ) : null}
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
