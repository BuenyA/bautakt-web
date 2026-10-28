import { type DeskDue, formatMoney } from '@bautakt/finance';
import { SkeletonBlock } from '@bautakt/ui';
import { Badge, Card, CardHeader, MessageBar, Text } from '@fluentui/react-components';
import { ChevronRightRegular, type FluentIcon } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { useRouterLink } from '@/components/common/useRouterLink';
import {
  DashboardEmptyIcon,
  DashboardEmptyState,
  EMPTY_ICON_SIZE,
} from '@/features/overview/components/DashboardEmptyState';

/**
 * So viele Zeilen zeigt die Karte; der Rest steckt hinter „Alle anzeigen“. Ab
 * `lg` reicht die Karte bis zum Fensterrand und die Liste scrollt in sich — so
 * füllt sie auch hohe Bildschirme, ohne endlos zu werden.
 */
const VISIBLE_ROWS = 12;

/**
 * Eine Rechnungskarte der Übersicht: unter dem Titel die offene Summe, darunter
 * die Rechnungen nach Fälligkeit. „Alle anzeigen“ sitzt rechts im Kartenkopf.
 *
 * Bewusst ohne Filter-Chips (Owner 28.10.2026): Ob eine Rechnung überfällig,
 * bald fällig oder offen ist, steht an der Zeile selbst (`DeskRow`). Ohne
 * Rechnungen derselbe Leerzustand wie im Einsatzplan der Startseite, mit
 * Anlegen-Knopf.
 */
export function DeskCard({
  title,
  icon: Icon,
  minor,
  sumLabel,
  rows,
  allTo,
  empty,
  emptyAction,
  isLoading,
  isError,
  errorText,
}: {
  title: string;
  icon: FluentIcon;
  /** Offene Summe in Cent. */
  minor: number;
  /** Zeile unter der Summe, z. B. „Offene Eingangsrechnungen“. */
  sumLabel: string;
  rows: ReactNode[];
  /** Ziel von „Alle anzeigen“. */
  allTo: string;
  empty: string;
  /** Anlegen-Knopf im Leerzustand; ohne Recht weglassen. */
  emptyAction?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  errorText: string;
}) {
  const { t } = useTranslation();
  const hidden = rows.length - VISIBLE_ROWS;

  return (
    <Card size="large" className="h-full">
      <CardHeader
        image={<Icon fontSize={20} aria-hidden />}
        header={
          <Text as="h2" weight="semibold" size={400}>
            {title}
          </Text>
        }
        action={
          <RouterLink to={allTo}>
            {hidden > 0
              ? t('domain:overview.todo.more', { count: hidden })
              : t('domain:invoiceDesk.showAll')}
          </RouterLink>
        }
      />

      {isError ? (
        <MessageBar intent="error">{errorText}</MessageBar>
      ) : isLoading ? (
        <SkeletonBlock className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <DashboardEmptyState
          icon={
            <DashboardEmptyIcon>
              <Icon fontSize={EMPTY_ICON_SIZE / 2} aria-hidden />
            </DashboardEmptyIcon>
          }
          title={empty}
          action={emptyAction}
        />
      ) : (
        <>
          <div className="flex flex-col">
            <Text size={700} weight="semibold" className="tabular-nums">
              {formatMoney(minor)}
            </Text>
            <Text size={200} className="text-text-secondary">
              {sumLabel}
            </Text>
          </div>

          {/* Ab `lg` ist die Karte so hoch wie die Seite bis zum Fensterrand;
              die Liste füllt den Rest und scrollt in sich. */}
          <div className="min-h-0 flex-1 lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1">
            <ul className="flex flex-col">{rows.slice(0, VISIBLE_ROWS)}</ul>
          </div>
        </>
      )}
    </Card>
  );
}

/**
 * Eine Rechnung in der Karte: links wer und was, rechts Betrag und Stand.
 * Etwas größer als die Zeilen der Startseite (Owner 28.10.2026).
 */
export function DeskRow({
  to,
  title,
  subtitle,
  minor,
  due,
}: {
  to: string;
  title: string;
  subtitle?: string;
  minor: number;
  due: DeskDue;
}) {
  const link = useRouterLink(to);
  return (
    <li className="border-border border-b last:border-b-0">
      <a
        href={link.href}
        onClick={link.onClick}
        className="group hover:bg-muted flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size={400} weight="medium" truncate wrap={false}>
            {title}
          </Text>
          {subtitle ? (
            <Text size={300} className="text-text-secondary" truncate wrap={false}>
              {subtitle}
            </Text>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Text size={400} weight="semibold" className="tabular-nums">
            {formatMoney(minor)}
          </Text>
          <DueBadge due={due} />
        </span>
        <ChevronRightRegular
          fontSize={16}
          className="text-text-subtle group-hover:text-foreground shrink-0"
          aria-hidden
        />
      </a>
    </li>
  );
}

function DueBadge({ due }: { due: DeskDue }) {
  const { t } = useTranslation();
  const prefix = 'domain:invoiceDesk.due';
  switch (due.kind) {
    case 'overdue':
      return (
        <Badge appearance="tint" color="danger" size="small">
          {t(`${prefix}.overdue`, { count: due.days })}
        </Badge>
      );
    case 'dueSoon':
      return (
        <Badge appearance="tint" color="warning" size="small">
          {due.days === 0
            ? t(`${prefix}.today`)
            : due.days === 1
              ? t(`${prefix}.tomorrow`)
              : t(`${prefix}.soon`, { count: due.days })}
        </Badge>
      );
    case 'draft':
      return (
        <Badge appearance="tint" color="informative" size="small">
          {t(`${prefix}.draft`)}
        </Badge>
      );
    default:
      return (
        <Badge appearance="tint" color="subtle" size="small">
          {t(`${prefix}.open`)}
        </Badge>
      );
  }
}
