import { type DeskGroup, firstFilledGroup, formatMoney } from '@bautakt/finance';
import { SkeletonBlock } from '@bautakt/ui';
import {
  Card,
  CardHeader,
  CounterBadge,
  MessageBar,
  Tab,
  TabList,
  Text,
} from '@fluentui/react-components';
import type { FluentIcon } from '@fluentui/react-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';

/**
 * So viele Zeilen je Gruppe; der Rest steckt hinter „Alle anzeigen“. Ab `lg`
 * reicht die Karte bis zum Fensterrand und die Liste scrollt in sich — so
 * füllt sie auch hohe Bildschirme, ohne endlos zu werden.
 */
const VISIBLE_ROWS = 12;

export type DeskGroupView = {
  label: string;
  empty: string;
  /** Ziel von „Alle anzeigen“ — die Liste mit passendem Filter. */
  to: string;
  /** Rote Zahl im Chip, solange die Gruppe nicht leer ist. */
  urgent?: boolean;
};

/**
 * Eine Rechnungskarte der Übersicht: Gruppen als Chips oben, darunter die
 * Summe der gewählten Gruppe und ihre Belege.
 *
 * Die Chips filtern in der Karte, statt die Seite zu wechseln — man sieht in
 * einem Blick, was überfällig, offen oder liegen geblieben ist. Vorausgewählt
 * ist die erste Gruppe mit Inhalt in `order`, also das Dringendste.
 */
export function DeskCard<K extends string, T>({
  title,
  icon: Icon,
  order,
  groups,
  views,
  renderRow,
  isLoading,
  isError,
  errorText,
}: {
  title: string;
  icon: FluentIcon;
  order: readonly K[];
  groups: Record<K, DeskGroup<T>>;
  views: Record<K, DeskGroupView>;
  renderRow: (item: T) => ReactNode;
  isLoading: boolean;
  isError: boolean;
  errorText: string;
}) {
  const { t } = useTranslation();
  // Erst gewählt, wenn jemand klickt: bis dahin folgt die Karte den Daten,
  // sonst bliebe sie nach dem Laden auf der (leeren) ersten Gruppe stehen.
  const [picked, setPicked] = useState<K | null>(null);
  const selected = picked ?? firstFilledGroup(order, groups);
  const current = groups[selected];
  const view = views[selected];
  const hidden = current.items.length - VISIBLE_ROWS;

  return (
    <Card size="large" className="h-full">
      <CardHeader
        image={<Icon fontSize={20} aria-hidden />}
        header={
          <Text as="h2" weight="semibold" size={400}>
            {title}
          </Text>
        }
      />

      {isError ? (
        <MessageBar intent="error">{errorText}</MessageBar>
      ) : isLoading ? (
        <SkeletonBlock className="h-64 w-full" />
      ) : (
        <>
          <TabList
            size="small"
            appearance="subtle-circular"
            selectedValue={selected}
            onTabSelect={(_, data) => setPicked(data.value as K)}
            aria-label={t('domain:invoiceDesk.groupsLabel')}
            className="-mx-1"
            // Inline, weil Fluents eigene Klassen ein Tailwind-`flex-wrap`
            // überstimmen; in schmalen Karten würde der letzte Chip abgeschnitten.
            style={{ flexWrap: 'wrap' }}
          >
            {order.map((key) => {
              const count = groups[key].items.length;
              return (
                <Tab key={key} value={key}>
                  <span className="flex items-center gap-1.5">
                    {views[key].label}
                    <CounterBadge
                      size="small"
                      appearance={views[key].urgent && count > 0 ? 'filled' : 'ghost'}
                      color={views[key].urgent && count > 0 ? 'danger' : 'informative'}
                      count={count}
                      showZero
                    />
                  </span>
                </Tab>
              );
            })}
          </TabList>

          <div className="flex items-baseline justify-between gap-2">
            <Text size={600} weight="semibold" className="tabular-nums">
              {formatMoney(current.minor)}
            </Text>
            <RouterLink to={view.to} className="text-xs">
              {hidden > 0
                ? t('domain:overview.todo.more', { count: hidden })
                : t('domain:invoiceDesk.showAll')}
            </RouterLink>
          </div>

          {/* Ab `lg` ist die Karte so hoch wie die Seite bis zum Fensterrand;
              die Liste füllt den Rest und scrollt in sich. */}
          <div className="min-h-0 flex-1 lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1">
            {current.items.length === 0 ? (
              // Ein `<p>` statt Fluent-`Text`: dessen Inline-Span sprengte mit
              // Innenabstand die Scrollfläche und zeigte einen Mini-Scrollbalken.
              <p className="text-muted-foreground py-6 text-center text-sm">{view.empty}</p>
            ) : (
              <ul className="flex flex-col">
                {current.items.slice(0, VISIBLE_ROWS).map(renderRow)}
              </ul>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
