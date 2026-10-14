import { Tab, TabList } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { useMembership } from '@/features/company/useMembership';
import { cardMatches, financeHub, visibleHubCards } from '@/features/hubs/hubs';

/**
 * Rahmen des Bereichs „Rechnungen“: die Reiter über jeder Liste des Bereichs.
 *
 * Editor, Beleg und Druck hängen bewusst nicht darunter — wer eine Rechnung
 * schreibt, braucht keinen Weg in die Mahnungen.
 */
export function FinanceLayout() {
  return (
    <div className="flex flex-col gap-4">
      <FinanceTabs />
      <Outlet />
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
      // Ohne Rand links: die Reiter stehen bündig mit der Überschrift darunter.
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
