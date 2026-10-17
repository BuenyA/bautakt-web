import { Tab, TabList } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { PageHeader } from '@/components/common/PageHeader';
import { useMembership } from '@/features/company/useMembership';
import { cardMatches, financeHub, visibleHubCards } from '@/features/hubs/hubs';

/**
 * Kopf jeder Liste im Bereich „Rechnungen“: Überschrift, darunter die Reiter
 * des Bereichs — dasselbe Muster wie bei Aufträgen. Die Überschrift ist der
 * Bereich, die Beschreibung sagt, welcher Reiter offen ist.
 *
 * Editor, Beleg und Druck haben keinen solchen Kopf — wer eine Rechnung
 * schreibt, braucht keinen Weg in die Mahnungen.
 */
export function FinanceHeader({
  title,
  description,
  actions,
}: {
  /** Nur für Unterseiten ohne eigenen Reiter (Offene Posten). */
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title={title ?? t('common:nav.finance')}
        description={description}
        actions={actions}
      />
      <FinanceTabs />
    </div>
  );
}

function FinanceTabs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: membership, isPending } = useMembership();
  const cards = visibleHubCards(financeHub, membership?.permissions);
  // Solange die Rechte laden, wäre nur „Übersicht“ sichtbar und markiert —
  // die Leiste spränge danach. Lieber eine leere Zeile gleicher Höhe.
  if (isPending) return <div className="h-11" aria-hidden />;
  const selected = cards.find((card) => cardMatches(pathname, card))?.to ?? financeHub.to;

  return (
    <TabList
      // Ohne Rand links: die Reiter stehen bündig mit der Überschrift darüber.
      // Am Handy wischt man durch die Reiter; ein Scrollbalken wäre nur Lärm.
      className="-mx-2.5 overflow-x-auto [scrollbar-width:none]"
      selectedValue={selected}
      onTabSelect={(_, { value }) => void navigate(String(value))}
      aria-label={t('common:nav.finance')}
    >
      <Tab value={financeHub.to}>{t('common:hub.finance.tabs.overview')}</Tab>
      {cards.map((card) => (
        <Tab key={card.to} value={card.to}>
          {t(card.titleKey)}
        </Tab>
      ))}
    </TabList>
  );
}
