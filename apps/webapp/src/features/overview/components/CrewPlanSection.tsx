import { SkeletonBlock } from '@bautakt/ui';
import {
  Button,
  Card,
  CardHeader,
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
import { COLUMN_SCROLL } from './layout';

const useStyles = makeStyles({
  // Vergangene Einsätze treten zurück. Laufende bekommen bewusst keine
  // Hervorhebung: Farbe zog den Blick auf den Einsatzplan, obwohl er nicht der
  // wichtigste Bereich ist.
  done: {
    opacity: 0.7,
  },
  timePill: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
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
    <Card size="large" className="h-full" id="einsatzplan">
      <CardHeader
        image={<PeopleTeamRegular fontSize={20} aria-hidden />}
        header={
          <Text as="h2" weight="semibold" size={400}>
            {t('domain:overview.crew.title')}
            {assignments.length > 0 ? (
              <Text size={200} weight="regular" className="text-text-secondary ml-2">
                {t('domain:overview.crew.count', { count: assignments.length })}
              </Text>
            ) : null}
          </Text>
        }
        action={<RouterLink to={routes.assignments}>{t('domain:overview.crew.toPlan')}</RouterLink>}
      />

      <div className={COLUMN_SCROLL}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <SkeletonBlock className="h-36 w-full" />
            <SkeletonBlock className="h-36 w-full" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
              <PeopleTeamRegular fontSize={24} aria-hidden />
            </span>
            <Text className="text-muted-foreground">{t('domain:overview.crew.empty')}</Text>
            {canPlan ? (
              <LinkButton
                to={withCreate(routes.assignments)}
                appearance="primary"
                icon={<AddRegular />}
                className="mt-2"
              >
                {t('domain:overview.today.plan')}
              </LinkButton>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <AssignmentTile
                  assignment={assignment}
                  urls={urls}
                  phase={assignmentPhase(assignment.startsAt, assignment.endsAt, now)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
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
      size="medium"
      appearance="outline"
      className={mergeClasses(phase === 'done' && styles.done)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Text weight="bold" size={300} truncate wrap={false}>
            {assignment.orderName}
          </Text>
          {assignment.location ? (
            <Text size={200} className="text-text-secondary line-clamp-2">
              {assignment.location}
            </Text>
          ) : null}
        </div>
        <span
          className={mergeClasses(
            'shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums',
            styles.timePill,
          )}
        >
          {time}
        </span>
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
            <CrewAvatars crew={assignment.crew} urls={urls} size={24} />
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

      <Divider />
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
        {/* Fluent setzt an Knöpfen und Links eigene Ränder; ml-auto sitzt deshalb am Wrapper. */}
        <span className="ml-auto">
          <LinkButton to={routes.assignment(assignment.id)} size="small">
            {t('domain:overview.crew.assignment')}
          </LinkButton>
        </span>
      </div>
    </Card>
  );
}
