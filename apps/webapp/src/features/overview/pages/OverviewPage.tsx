import { useMemo } from 'react';

import { useProfileImageUrls } from '@/features/team/useProfileImageUrls';

import { type GreetingChip, OverviewGreeting } from '../components/OverviewGreeting';
import { TodayPlanCard } from '../components/TodayPlanCard';
import { TodoPanel } from '../components/TodoPanel';
import { YearKpiRow } from '../components/YearKpiRow';
import { useOverviewData } from '../useOverviewData';
import { useMyFirstName } from '../useTodayData';

/**
 * Die Startseite: der ganze Betrieb auf einen Blick.
 *
 * Oben, was heute ist — wer wo arbeitet, wer fehlt, welche Termine anstehen —
 * und daneben, was jemand anfassen muss. Darunter die Zahlen des Jahres.
 * „Heute zuerst“, weil sich das über den Tag ändert; die Jahreszahlen nicht.
 *
 * ⚠️ Ohne Finanzrecht entfällt die Zahlenzeile ganz — nicht mit Nullen darin.
 * Eine Null sähe aus wie „keine Forderungen“ und wäre eine Falschaussage.
 * Dasselbe gilt für jeden Abschnitt in „Zu erledigen“.
 */
export function OverviewPage() {
  const data = useOverviewData();
  const firstName = useMyFirstName();
  const { today, todo, finance, access } = data;

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

  const chips: GreetingChip[] = [
    { key: 'pendingAbsences', count: todo.pendingAbsences.length, target: 'antraege' },
    { key: 'absentToday', count: today.absences.length, target: 'heute' },
    { key: 'newIncoming', count: todo.newIncoming.length, target: 'eingang' },
    {
      key: 'deadlinesDue',
      count: todo.deadlines.filter((deadline) => deadline.daysLeft <= 0).length,
      target: 'fristen',
    },
    { key: 'overdue', count: todo.overdue.length, target: 'ueberfaellig', tone: 'danger' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <OverviewGreeting firstName={firstName.data ?? ''} chips={chips} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TodayPlanCard
            assignments={today.assignments}
            events={today.events}
            absences={today.absences}
            urls={urls}
            canPlan={access.canPlan}
            isLoading={today.isLoading}
            isError={today.isError}
          />
        </div>
        <div className="min-w-0">
          <TodoPanel
            pendingAbsences={todo.pendingAbsences}
            newIncoming={todo.newIncoming}
            deadlines={todo.deadlines}
            overdue={todo.overdue}
            tasks={todo.tasks}
            urls={urls}
            isLoading={todo.isLoading}
          />
        </div>
      </div>

      {finance ? (
        <YearKpiRow
          result={finance.result}
          kpis={finance.kpis}
          revenueByMonth={finance.revenueByMonth}
          expensesByMonth={finance.expensesByMonth}
          laborIncluded={finance.laborIncluded}
          isLoading={finance.isLoading}
          isError={finance.isError}
        />
      ) : null}
    </div>
  );
}
