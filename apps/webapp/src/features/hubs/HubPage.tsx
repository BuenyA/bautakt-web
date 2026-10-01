import { cn, Uicon } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useMembership } from '@/features/company/useMembership';

import {
  financeHub,
  materialHub,
  personalHub,
  visibleHubCards,
  type Hub,
  type HubCard,
} from './hubs';

/**
 * Landing eines Hubs: Titel und Karten auf bestehende Routen.
 * Breite bis 1120px, links wie der uebrige App-Inhalt. Das Padding kommt
 * von der Shell.
 */
function HubPage({ hub }: { hub: Hub }) {
  const { t } = useTranslation();
  const membership = useMembership();
  const cards = visibleHubCards(hub, membership.data?.permissions);

  return (
    <div className="flex w-full max-w-[1120px] flex-col gap-6">
      <PageHeader title={t(hub.titleKey)} description={t(hub.descriptionKey)} />

      {membership.isPending ? (
        <PageSpinner />
      ) : membership.isError ? (
        <EmptyState
          title={t('errors:boundary.title')}
          description={t('errors:generic')}
          action={
            <button
              type="button"
              className="text-primary cursor-pointer text-sm font-medium hover:underline"
              onClick={() => void membership.refetch()}
            >
              {t('common:action.retry')}
            </button>
          }
        />
      ) : cards.length === 0 ? (
        <EmptyState
          title={t('common:hub.emptyTitle')}
          description={t('common:hub.emptyDescription')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <HubCardLink key={card.titleKey} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function HubCardLink({ card }: { card: HubCard }) {
  const { t } = useTranslation();

  return (
    <Link
      to={card.to}
      className={cn(
        'bg-card border-border flex min-h-[120px] flex-col items-start gap-3 rounded-xl border p-5 shadow-sm',
        'transition duration-150',
        'hover:border-border-strong hover:bg-surface hover:shadow-md',
        'dark:hover:bg-card-raised',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-background focus-visible:outline-none',
        'active:opacity-95',
        card.featured && 'ring-primary/30 ring-1 sm:col-span-2',
      )}
    >
      <span className="bg-accent dark:bg-card-raised flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Uicon name={card.icon} size={22} className="text-primary" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-foreground text-base font-semibold">{t(card.titleKey)}</span>
        <span className="text-muted-foreground line-clamp-2 text-sm">{t(card.descriptionKey)}</span>
      </span>
      <Uicon name="angle-right" size={16} className="text-muted-foreground" />
    </Link>
  );
}

export function FinanceHubPage() {
  return <HubPage hub={financeHub} />;
}

export function PersonalHubPage() {
  return <HubPage hub={personalHub} />;
}

export function MaterialHubPage() {
  return <HubPage hub={materialHub} />;
}
