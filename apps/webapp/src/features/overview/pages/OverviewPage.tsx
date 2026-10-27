import { useMemo } from 'react';

import { useProfileImageUrls } from '@/features/team/useProfileImageUrls';

import { CrewPlanSection } from '../components/CrewPlanSection';
import { OverviewGreeting } from '../components/OverviewGreeting';
import { TodayPlanCard } from '../components/TodayPlanCard';
import { TodoPanel } from '../components/TodoPanel';
import { useOverviewData } from '../useOverviewData';
import { useMyFirstName } from '../useTodayData';

/**
 * Die Startseite: der ganze Betrieb auf einen Blick.
 *
 * Oben in einer Reihe: Einsatzplan (eine Kachel je Einsatz), was jemand
 * anfassen muss, und schmal der Tag als Zeitleiste mit Abwesenden und Terminen.
 * Die Jahreszahlen stehen in den Auswertungen, nicht hier.
 *
 * ⚠️ Ohne Finanzrecht entfällt jeder Finanzabschnitt in „Zu erledigen“ ganz —
 * nicht mit Nullen darin. Eine Null sähe aus wie „keine Forderungen“ und wäre
 * eine Falschaussage.
 */
export function OverviewPage() {
  const data = useOverviewData();
  const firstName = useMyFirstName();
  const { today, todo, access } = data;

  const imagePaths = useMemo(
    () => [
      ...today.assignments.flatMap((assignment) =>
        assignment.crew.map((member) => member.imagePath),
      ),
      ...today.absences.map((absence) => absence.member.imagePath),
      ...todo.pendingAbsences.map((absence) => absence.member.imagePath),
    ],
    [today.assignments, today.absences, todo.pendingAbsences],
  );
  const urls = useProfileImageUrls(imagePaths).data ?? {};

  return (
    <div className="flex flex-col gap-6">
      <OverviewGreeting firstName={firstName.data ?? ''} />

      {/*
        Eine Reihe auf breiten Bildschirmen: links der Einsatzplan (wer ist wo —
        die erste Frage am Morgen), in der Mitte, gleich breit, was zu tun ist,
        rechts schmal der Kalender — er zeigt ohnehin nur den heutigen Tag.
      */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[5fr_5fr_3fr]">
        <div className="min-w-0">
          <CrewPlanSection
            assignments={today.assignments}
            urls={urls}
            canPlan={access.canPlan}
            isLoading={today.isLoading}
          />
        </div>
        <div className="min-w-0">
          <TodoPanel
            pendingAbsences={todo.pendingAbsences}
            newIncoming={todo.newIncoming}
            deadlines={todo.deadlines}
            exemptions={todo.exemptions}
            overdue={todo.overdue}
            tasks={todo.tasks}
            urls={urls}
            isLoading={todo.isLoading}
          />
        </div>
        <div className="min-w-0 lg:col-span-2 xl:col-span-1">
          <TodayPlanCard
            assignments={today.assignments}
            events={today.events}
            absences={today.absences}
            urls={urls}
            isLoading={today.isLoading}
            isError={today.isError}
          />
        </div>
      </div>
    </div>
  );
}
