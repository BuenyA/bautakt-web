import { SkeletonBlock } from '@bautakt/ui';
import {
  Card,
  CardHeader,
  CounterBadge,
  Link as FluentLink,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { LinkButton } from '@/components/common/LinkButton';
import { RouterLink } from '@/components/common/RouterLink';

/**
 * Vorschau eines Bereichs auf der Auftragsübersicht: Kopf mit Symbol, Titel
 * und Anzahl, rechts höchstens eine Schnellaktion, unten „Alle anzeigen“.
 * Der Inhalt bleibt kurz (wenige Zeilen), damit die Karten einer Reihe gleich
 * hoch sind; alles Weitere steht auf der Unterseite.
 */
export function OrderPreviewCard({
  icon,
  title,
  count,
  to,
  quickAction,
  children,
}: {
  icon: ReactElement;
  title: string;
  count?: number;
  to: string;
  quickAction?: { to: string; label: string; icon: ReactElement };
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card size="large" className="h-full">
      <CardHeader
        image={<span className="text-brand flex text-xl">{icon}</span>}
        header={
          <span className="flex items-center gap-2">
            <Text as="h2" size={400} weight="semibold">
              {title}
            </Text>
            {count ? <CounterBadge count={count} overflowCount={999} color="informative" /> : null}
          </span>
        }
        action={
          quickAction ? (
            <Tooltip content={quickAction.label} relationship="label">
              <LinkButton
                to={quickAction.to}
                appearance="subtle"
                icon={quickAction.icon}
                aria-label={quickAction.label}
              />
            </Tooltip>
          ) : undefined
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div>
      <div>
        <RouterLink to={to}>{t('domain:orders.preview.showAll')}</RouterLink>
      </div>
    </Card>
  );
}

/** Eine Zeile der Vorschau: links der Inhalt, rechts klein Datum oder Menge. */
export function PreviewRow({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-foreground min-w-0 truncate">{primary}</span>
      {secondary ? (
        <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap tabular-nums">
          {secondary}
        </span>
      ) : null}
    </li>
  );
}

export function PreviewEmpty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

export function PreviewError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <p className="text-muted-foreground text-sm">
      {t('domain:orders.preview.loadError')}{' '}
      <FluentLink as="button" inline onClick={onRetry}>
        {t('common:action.retry')}
      </FluentLink>
    </p>
  );
}

export function PreviewSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2" role="status">
      <span className="sr-only">{t('common:state.loading')}</span>
      <SkeletonBlock className="h-4 w-3/4 rounded" />
      <SkeletonBlock className="h-4 w-1/2 rounded" />
      <SkeletonBlock className="h-4 w-2/3 rounded" />
    </div>
  );
}
