import { SkeletonBlock } from '@bautakt/ui';
import {
  Badge,
  Button,
  Card,
  Divider,
  makeStyles,
  mergeClasses,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  AddRegular,
  BriefcaseRegular,
  LocationRegular,
  PeopleTeamRegular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { LinkButton } from '@/components/common/LinkButton';
import { RouterLink } from '@/components/common/RouterLink';
import { formatTime } from '@/lib/format';
import { routes, withCreate } from '@/lib/routes';

import { type AssignmentPhase, assignmentPhase, mapsSearchUrl } from '../today';
import type { TodayAssignment } from '../useTodayData';
import { CrewAvatars } from './CrewAvatars';

const useStyles = makeStyles({
  // Wie der „heute“-Look der App: Brand-Rahmen und zarte Brand-Fläche.
  running: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
  },
  done: {
    opacity: 0.7,
  },
  timePill: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
  },
  timePillRunning: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  noCrew: {
    color: tokens.colorPaletteMarigoldForeground2,
  },
});

/**
 * Einsatzplan für heute: jeder Einsatz eine Kachel wie in der Handy-App
 * (`WorkAssignmentCard`) — Auftrag, Baustelle, Uhrzeit, Team mit Bildern —
 * und darunter die Wege, die man morgens braucht: zum Auftrag, nach Google
 * Maps, zum Einsatz.
 */
export function CrewPlanSection({
  assignments,
  urls,
  canPlan,
  isLoading,
  now,
}: {
  assignments: readonly TodayAssignment[];
  urls: Record<string, string>;
  canPlan: boolean;
  isLoading: boolean;
  now: Date;
}) {
  const { t } = useTranslation();

  return (
    <section
      id="einsatzplan"
      aria-labelledby="einsatzplan-titel"
      className="flex scroll-mt-20 flex-col gap-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <Text as="h2" id="einsatzplan-titel" weight="semibold" size={400}>
            {t('domain:overview.crew.title')}
          </Text>
          {assignments.length > 0 ? (
            <Text size={200} className="text-text-secondary">
              {t('domain:overview.crew.count', { count: assignments.length })}
            </Text>
          ) : null}
        </div>
        <RouterLink to={routes.assignments}>{t('domain:overview.crew.toPlan')}</RouterLink>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonBlock className="h-44 w-full" />
          <SkeletonBlock className="h-44 w-full" />
        </div>
      ) : assignments.length === 0 ? (
        <Card size="large">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <PeopleTeamRegular fontSize={24} className="text-muted-foreground" aria-hidden />
              <Text className="text-muted-foreground">{t('domain:overview.crew.empty')}</Text>
            </span>
            {canPlan ? (
              <LinkButton to={withCreate(routes.assignments)} icon={<AddRegular />}>
                {t('domain:overview.today.plan')}
              </LinkButton>
            ) : null}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => (
            <AssignmentTile
              key={assignment.id}
              assignment={assignment}
              urls={urls}
              phase={assignmentPhase(assignment.startsAt, assignment.endsAt, now)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AssignmentTile({
  assignment,
  urls,
  phase,
}: {
  assignment: TodayAssignment;
  urls: Record<string, string>;
  phase: AssignmentPhase;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const time = `${formatTime(assignment.startsAt)}–${formatTime(assignment.endsAt)}`;
  const crewLabel =
    assignment.crew.length === 1
      ? assignment.crew[0].name
      : t('domain:overview.today.crewCount', { count: assignment.crew.length });

  return (
    <Card
      size="large"
      className={mergeClasses(
        'h-full',
        phase === 'running' && styles.running,
        phase === 'done' && styles.done,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Text weight="bold" size={400} truncate wrap={false}>
            {assignment.orderName}
          </Text>
          {assignment.location ? (
            <Text size={200} className="text-text-secondary line-clamp-2">
              {assignment.location}
            </Text>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={mergeClasses(
              'rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums',
              styles.timePill,
              phase === 'running' && styles.timePillRunning,
            )}
          >
            {time}
          </span>
          {phase === 'running' ? (
            <Badge appearance="tint" color="brand" size="small">
              {t('domain:overview.crew.running')}
            </Badge>
          ) : phase === 'done' ? (
            <Badge appearance="tint" color="informative" size="small">
              {t('domain:overview.crew.done')}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {assignment.crew.length > 0 ? (
          <>
            <Text
              size={200}
              weight="medium"
              className="text-text-secondary min-w-0"
              truncate
              wrap={false}
            >
              {crewLabel}
            </Text>
            <CrewAvatars crew={assignment.crew} urls={urls} size={28} />
          </>
        ) : (
          <Text size={200} weight="medium" className={styles.noCrew}>
            {t('domain:overview.today.noCrew')}
          </Text>
        )}
      </div>

      {assignment.note ? (
        <Text size={200} className="text-text-subtle line-clamp-2">
          {assignment.note}
        </Text>
      ) : null}

      <Divider className="mt-auto" />
      <div className="flex flex-wrap items-center gap-2">
        <LinkButton to={routes.order(assignment.orderId)} size="small" icon={<BriefcaseRegular />}>
          {t('domain:overview.crew.order')}
        </LinkButton>
        {assignment.location ? (
          <Button
            as="a"
            href={mapsSearchUrl(assignment.location)}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            icon={<LocationRegular />}
            aria-label={t('domain:overview.crew.mapsA11y', { address: assignment.location })}
          >
            {t('domain:overview.crew.maps')}
          </Button>
        ) : null}
        <RouterLink to={routes.assignment(assignment.id)} className="ml-auto text-sm">
          {t('domain:overview.crew.assignment')}
        </RouterLink>
      </div>
    </Card>
  );
}
