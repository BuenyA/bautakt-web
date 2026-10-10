import {
  Button,
  Caption1,
  Card,
  CardHeader,
  Link as FluentLink,
  Text,
} from '@fluentui/react-components';
import { ChevronRight20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useRouterLink } from '@/components/common/useRouterLink';
import { useMembership } from '@/features/company/useMembership';

import {
  financeHub,
  type Hub,
  type HubCard,
  materialHub,
  personalHub,
  visibleHubCards,
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
            <Button onClick={() => void membership.refetch()}>{t('common:action.retry')}</Button>
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

/**
 * Eine Kachel als Fluent-`Card`. Der Titel ist ein echter Link (Tastatur,
 * Strg-Klick); ein Klick irgendwo auf die Karte führt zum selben Ziel.
 */
function HubCardLink({ card }: { card: HubCard }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const link = useRouterLink(card.to);
  const CardIcon = card.icon;

  return (
    <Card
      size="large"
      className={card.featured ? 'sm:col-span-2' : undefined}
      onClick={() => navigate(card.to)}
    >
      <CardHeader
        image={
          <span className="bg-accent flex size-10 items-center justify-center rounded-lg">
            <CardIcon fontSize={24} className="text-brand" />
          </span>
        }
        header={
          <FluentLink
            href={link.href}
            onClick={(event) => {
              event.stopPropagation();
              link.onClick(event);
            }}
            appearance="subtle"
          >
            <Text weight="semibold" size={400}>
              {t(card.titleKey)}
            </Text>
          </FluentLink>
        }
        description={
          <Caption1 className="text-muted-foreground">{t(card.descriptionKey)}</Caption1>
        }
        action={<ChevronRight20Regular className="text-muted-foreground" aria-hidden />}
      />
    </Card>
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
