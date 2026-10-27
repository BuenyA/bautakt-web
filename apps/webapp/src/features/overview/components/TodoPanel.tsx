import {
  eurosToMinor,
  formatMoney,
  type OpenTaskCounts,
  type ReceivableItem,
} from '@bautakt/finance';
import { SkeletonBlock, toast } from '@bautakt/ui';
import {
  Button,
  Card,
  CardHeader,
  makeStyles,
  mergeClasses,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  CheckmarkRegular,
  ChevronRightRegular,
  DismissRegular,
  TaskListLtrRegular,
} from '@fluentui/react-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { useRouterLink } from '@/components/common/useRouterLink';
import type { IncomingInvoiceListRow } from '@/features/finance/useExpenses';
import { AbsenceActionDialog } from '@/features/team/AbsenceActionDialog';
import { useApproveAbsence } from '@/features/team/useAbsences';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import type { Deadline, ExpiringExemption } from '../today';
import type { OverviewAbsence } from '../useTodayData';
import { MemberAvatar } from './CrewAvatars';
import { DashboardEmptyState, EMPTY_ICON_SIZE } from './DashboardEmptyState';
import { COLUMN_FILL_SCROLL } from './layout';

const useStyles = makeStyles({
  // Die Karte ist in der Zeile so hoch wie der Einsatzplan. Der Körper füllt
  // diese Höhe, sonst klebt der leere Zustand unter dem Kopf.
  card: {
    height: '100%',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
  },
  // Umriss in der Erfolgsfarbe, so groß wie der Kreis im Einsatzplan.
  doneIcon: {
    color: tokens.colorStatusSuccessForeground1,
  },
});

/** Je Abschnitt so viele Zeilen; der Rest steckt hinter „Alle anzeigen“. */
const VISIBLE_ROWS = 4;

/**
 * „Zu erledigen“: was heute jemand anfassen muss. Jeder Abschnitt erscheint
 * nur, wenn es etwas zu tun gibt und das Recht dafür da ist — eine leere
 * Überschrift wäre Rauschen.
 */
export function TodoPanel({
  pendingAbsences,
  newIncoming,
  deadlines,
  exemptions,
  overdue,
  tasks,
  urls,
  isLoading,
}: {
  pendingAbsences: readonly OverviewAbsence[];
  newIncoming: readonly IncomingInvoiceListRow[];
  deadlines: readonly Deadline[];
  exemptions: readonly ExpiringExemption[];
  overdue: readonly ReceivableItem[];
  tasks: OpenTaskCounts | null;
  urls: Record<string, string>;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const hasTasks = Boolean(tasks && tasks.dunnable + tasks.draftDocuments > 0);
  const isEmpty =
    pendingAbsences.length === 0 &&
    newIncoming.length === 0 &&
    deadlines.length === 0 &&
    exemptions.length === 0 &&
    overdue.length === 0 &&
    !hasTasks;

  return (
    <Card size="large" className={styles.card} id="zu-erledigen">
      <CardHeader
        image={<TaskListLtrRegular fontSize={20} aria-hidden />}
        header={
          <Text as="h2" weight="semibold" size={400}>
            {t('domain:overview.todo.title')}
          </Text>
        }
      />

      <div className={mergeClasses(COLUMN_FILL_SCROLL, styles.body)}>
        {isLoading ? (
          <SkeletonBlock className="h-48 w-full" />
        ) : isEmpty ? (
          <DashboardEmptyState
            icon={
              <CheckmarkCircleRegular
                fontSize={EMPTY_ICON_SIZE}
                className={styles.doneIcon}
                aria-hidden
              />
            }
            title={
              <Text size={500} weight="semibold">
                {t('domain:overview.todo.emptyTitle')}
              </Text>
            }
            description={t('domain:overview.todo.emptyHint')}
          />
        ) : (
          <div className="flex flex-col gap-5">
            {pendingAbsences.length > 0 ? (
              <Section
                id="antraege"
                title={t('domain:overview.todo.pendingAbsences')}
                count={pendingAbsences.length}
                to={`${routes.absences}?status=offen`}
              >
                {pendingAbsences.slice(0, VISIBLE_ROWS).map((absence) => (
                  <AbsenceRow key={absence.id} absence={absence} urls={urls} />
                ))}
              </Section>
            ) : null}

            {newIncoming.length > 0 ? (
              <Section
                id="eingang"
                title={t('domain:overview.todo.newIncoming')}
                hint={t('domain:overview.todo.newIncomingHint')}
                count={newIncoming.length}
                to={routes.expenses}
              >
                {newIncoming.slice(0, VISIBLE_ROWS).map((invoice) => (
                  <Row
                    key={invoice.id}
                    to={routes.expenses}
                    title={invoice.vendor_name || invoice.invoice_number}
                    subtitle={
                      invoice.due_date
                        ? t('domain:overview.todo.due', { date: formatDate(invoice.due_date) })
                        : invoice.invoice_number
                    }
                    trailing={formatMoney(eurosToMinor(invoice.gross_total))}
                  />
                ))}
              </Section>
            ) : null}

            {deadlines.length > 0 ? (
              <Section
                id="fristen"
                title={t('domain:overview.todo.deadlines')}
                count={deadlines.length}
              >
                {deadlines.slice(0, VISIBLE_ROWS).map((deadline) => (
                  <Row
                    key={`${deadline.kind}-${deadline.id}`}
                    to={deadlineTarget(deadline)}
                    title={deadline.label}
                    subtitle={t(`domain:overview.todo.deadlineKinds.${deadline.kind}`)}
                    trailing={<DueLabel daysLeft={deadline.daysLeft} />}
                  />
                ))}
              </Section>
            ) : null}

            {exemptions.length > 0 ? (
              <Section
                id="freistellungen"
                title={t('domain:overview.todo.exemptions')}
                hint={t('domain:overview.todo.exemptionsHint')}
                count={exemptions.length}
                to={`${routes.contacts}?rolle=subunternehmer`}
              >
                {exemptions.slice(0, VISIBLE_ROWS).map((exemption) => (
                  <Row
                    key={exemption.contactId}
                    to={routes.contact(exemption.contactId)}
                    title={exemption.name}
                    subtitle={t(
                      exemption.daysLeft < 0
                        ? 'domain:overview.todo.exemptionExpired'
                        : 'domain:overview.todo.exemptionValidUntil',
                      { date: formatDate(exemption.validUntil) },
                    )}
                    trailing={<DueLabel daysLeft={exemption.daysLeft} />}
                  />
                ))}
              </Section>
            ) : null}

            {overdue.length > 0 ? (
              <Section
                id="ueberfaellig"
                title={t('domain:overview.todo.overdue')}
                count={overdue.length}
                to={`${routes.receivables}?klasse=1_30`}
              >
                {overdue.slice(0, VISIBLE_ROWS).map((item) => (
                  <Row
                    key={item.document.id}
                    to={routes.invoice(item.document.id)}
                    title={item.document.document_number ?? ''}
                    subtitle={t('domain:overview.todo.daysOverdue', { count: item.daysOverdue })}
                    trailing={
                      <span className="text-destructive font-semibold tabular-nums">
                        {formatMoney(item.openMinor)}
                      </span>
                    }
                  />
                ))}
              </Section>
            ) : null}

            {tasks && hasTasks ? (
              <Section id="belege" title={t('domain:overview.todo.billing')}>
                {tasks.dunnable > 0 ? (
                  <Row
                    to={routes.dunning}
                    title={t('domain:overview.todo.taskDunnable', { count: tasks.dunnable })}
                  />
                ) : null}
                {tasks.draftDocuments > 0 ? (
                  <Row
                    to={`${routes.invoices}?status=entwurf`}
                    title={t('domain:overview.todo.taskDrafts', { count: tasks.draftDocuments })}
                  />
                ) : null}
              </Section>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}

function deadlineTarget(deadline: Deadline): string {
  if (deadline.kind === 'invoice') return routes.invoice(deadline.id);
  if (deadline.kind === 'orderEnd') return routes.order(deadline.id);
  return routes.expenses;
}

function Section({
  id,
  title,
  hint,
  count,
  to,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  count?: number;
  to?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const hidden = count !== undefined ? count - VISIBLE_ROWS : 0;

  return (
    <section id={id} aria-label={title} className="flex scroll-mt-20 flex-col">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <Text size={200} weight="semibold" className="text-text-secondary uppercase">
          {title}
          {count !== undefined ? ` · ${count}` : ''}
        </Text>
        {to ? (
          <RouterLink to={to} className="text-xs">
            {hidden > 0
              ? t('domain:overview.todo.more', { count: hidden })
              : t('domain:overview.todo.showAll')}
          </RouterLink>
        ) : null}
      </div>
      {hint ? (
        <Text size={100} className="text-text-subtle mb-1">
          {hint}
        </Text>
      ) : null}
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

export function Row({
  to,
  title,
  subtitle,
  trailing,
}: {
  to: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const link = useRouterLink(to);
  return (
    <li className="border-border border-b last:border-b-0">
      <a
        href={link.href}
        onClick={link.onClick}
        className="group hover:bg-muted flex items-center gap-3 rounded-md px-1 py-2 transition-colors"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size={300} truncate wrap={false}>
            {title}
          </Text>
          {subtitle ? (
            <Text size={200} className="text-text-secondary" truncate wrap={false}>
              {subtitle}
            </Text>
          ) : null}
        </span>
        {trailing ? (
          <Text size={200} className="shrink-0 tabular-nums">
            {trailing}
          </Text>
        ) : null}
        <ChevronRightRegular
          fontSize={14}
          className="text-text-subtle group-hover:text-foreground shrink-0"
          aria-hidden
        />
      </a>
    </li>
  );
}

function DueLabel({ daysLeft }: { daysLeft: number }) {
  const { t } = useTranslation();
  if (daysLeft < 0) {
    return (
      <span className="text-destructive font-semibold">
        {t('domain:overview.todo.dueAgo', { count: -daysLeft })}
      </span>
    );
  }
  if (daysLeft === 0) {
    return <span className="text-warning font-semibold">{t('domain:overview.todo.dueToday')}</span>;
  }
  if (daysLeft === 1) return <span>{t('domain:overview.todo.dueTomorrow')}</span>;
  return <span>{t('domain:overview.todo.dueIn', { count: daysLeft })}</span>;
}

function AbsenceRow({ absence, urls }: { absence: OverviewAbsence; urls: Record<string, string> }) {
  const { t } = useTranslation();
  const approve = useApproveAbsence();
  const link = useRouterLink(routes.absence(absence.id));
  const [rejecting, setRejecting] = useState(false);
  const range =
    absence.startDate === absence.endDate
      ? formatDate(absence.startDate)
      : `${formatDate(absence.startDate)} – ${formatDate(absence.endDate)}`;

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

  return (
    <li className="border-border flex items-center gap-3 border-b py-2 last:border-b-0">
      <MemberAvatar member={absence.member} urls={urls} size={32} />
      {/* Name und Zeitraum führen zur Abwesenheit; die Knöpfe nur mit Symbol,
          damit sie auf kleinen Laptops nicht in den Text drücken. */}
      <a
        href={link.href}
        onClick={link.onClick}
        className="hover:bg-muted -my-1 flex min-w-0 flex-1 flex-col rounded-md px-1 py-1 transition-colors"
      >
        <Text size={300} weight="semibold" truncate wrap={false}>
          {absence.member.name}
        </Text>
        <Text size={200} className="text-text-secondary" truncate wrap={false}>
          {t(`domain:absences.types.${absence.type}`)} · {range}
        </Text>
      </a>
      <Button
        size="small"
        appearance="primary"
        icon={<CheckmarkRegular />}
        disabled={approve.isPending}
        onClick={onApprove}
        aria-label={t('domain:overview.todo.approveA11y', { name: absence.member.name })}
        title={t('domain:overview.todo.approve')}
      />
      <Button
        size="small"
        icon={<DismissRegular />}
        onClick={() => setRejecting(true)}
        aria-label={t('domain:overview.todo.rejectA11y', { name: absence.member.name })}
        title={t('domain:overview.todo.reject')}
      />
      <AbsenceActionDialog
        action={rejecting ? 'reject' : null}
        absence={{
          id: absence.id,
          name: absence.member.name,
          type: absence.type,
          startDate: absence.startDate,
          endDate: absence.endDate,
        }}
        onClose={() => setRejecting(false)}
      />
    </li>
  );
}
