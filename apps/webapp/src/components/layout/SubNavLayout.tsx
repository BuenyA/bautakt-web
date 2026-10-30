import {
  Button,
  Caption1,
  makeStyles,
  mergeClasses,
  Nav,
  NavDivider,
  NavItem,
  NavSectionHeader,
  Text,
  tokens,
} from '@fluentui/react-components';
import type { FluentIcon } from '@fluentui/react-icons';
import { ChevronLeft20Regular, ChevronRight16Regular } from '@fluentui/react-icons';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';

import { PageHeader } from '@/components/common/PageHeader';
import { useRouterLink } from '@/components/common/useRouterLink';

import { useMediaQuery } from './useMediaQuery';

export type SubNavItem = {
  to: string;
  labelKey: string;
  icon: FluentIcon;
  /** Fehlt das Recht, fehlt der Eintrag. Führung, keine Kontrolle (RLS). */
  visible?: boolean;
};

export type SubNavGroup = {
  /** Ohne Überschrift: Einträge ganz oben (etwa „Übersicht“). */
  titleKey?: string;
  items: SubNavItem[];
};

/** Unter dieser Breite: erst die Liste, dann der Abschnitt — wie in der App. */
const NARROW_QUERY = '(max-width: 1023px)';

const useStyles = makeStyles({
  nav: {
    backgroundColor: 'transparent',
    width: '100%',
    minWidth: 0,
    // Fluents `Nav` bringt eigenen Innenabstand mit; hier bündig zur Überschrift.
    paddingInline: 0,
  },
  sectionHeader: {
    paddingInlineStart: tokens.spacingHorizontalM,
  },
  // Fluents `NavItem` trägt die Fläche der Seitenleiste. Hier steht die
  // Navigation auf der Seite: transparent, Fläche nur bei Hover und Auswahl.
  item: {
    backgroundColor: 'transparent',
    ':hover': {
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
    ':active': {
      backgroundColor: tokens.colorSubtleBackgroundPressed,
    },
  },
  itemSelected: {
    backgroundColor: tokens.colorSubtleBackgroundSelected,
    ':hover': {
      backgroundColor: tokens.colorSubtleBackgroundSelected,
    },
  },
  mobileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    width: '100%',
    minHeight: '48px',
    justifyContent: 'flex-start',
  },
});

/** Normalisiert `/profil/` zu `/profil`. */
const trimSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

/**
 * Aktiver Eintrag: der längste passende Pfad. Die Startadresse (`/unternehmen`)
 * zählt nur exakt, sonst wäre sie für jeden Abschnitt aktiv.
 */
function activeItem(pathname: string, basePath: string, items: SubNavItem[]) {
  const path = trimSlash(pathname);
  return items
    .filter((item) =>
      item.to === basePath ? path === basePath : path === item.to || path.startsWith(`${item.to}/`),
    )
    .sort((a, b) => b.to.length - a.to.length)[0];
}

function SubNavLink({ item, selected }: { item: SubNavItem; selected: boolean }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const link = useRouterLink(item.to);
  const Icon = item.icon;
  return (
    <NavItem
      value={item.to}
      href={link.href}
      icon={<Icon />}
      className={mergeClasses(styles.item, selected && styles.itemSelected)}
      onClick={link.onClick}
    >
      {t(item.labelKey)}
    </NavItem>
  );
}

/** Schmale Ansicht: ein Eintrag der Liste, ganze Breite, Pfeil rechts. */
function MobileLink({ item }: { item: SubNavItem }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const link = useRouterLink(item.to);
  const Icon = item.icon;
  return (
    <Button
      as="a"
      href={link.href}
      onClick={link.onClick}
      appearance="subtle"
      icon={<Icon />}
      className={styles.mobileItem}
    >
      <span className="min-w-0 flex-1 truncate text-left">{t(item.labelKey)}</span>
      <ChevronRight16Regular aria-hidden />
    </Button>
  );
}

/**
 * Bereich mit Unternavigation — Mein Profil und Unternehmen.
 *
 * Breit: links die Abschnitte als Fluent-`Nav` mit Gruppenüberschriften,
 * rechts der Abschnitt (`Outlet`). Jeder Abschnitt hat eine eigene Adresse,
 * damit Links und Lesezeichen funktionieren.
 *
 * Schmal: auf der Startadresse die Liste (oder die Startseite, wenn es eine
 * gibt), im Abschnitt ein Zurück-Knopf dorthin. Hat der Bereich keine eigene Startseite (`indexPage: false`), führt
 * die Startadresse in der breiten Ansicht direkt zum ersten Abschnitt.
 */
export function SubNavLayout({
  title,
  subtitle,
  basePath,
  groups,
  indexPage,
  ariaLabel,
}: {
  title: string;
  subtitle?: ReactNode;
  basePath: string;
  groups: SubNavGroup[];
  /** `true`: die Startadresse ist selbst ein Abschnitt (Übersicht). */
  indexPage: boolean;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { pathname } = useLocation();
  const narrow = useMediaQuery(NARROW_QUERY);

  const visibleGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.visible !== false) }))
    .filter((group) => group.items.length > 0);
  const items = visibleGroups.flatMap((group) => group.items);
  const atIndex = trimSlash(pathname) === basePath;
  const selected = activeItem(pathname, basePath, items);
  const backLink = useRouterLink(basePath);

  const heading = (
    <div className="flex flex-col gap-0.5 px-3 pb-2">
      {/* Kein h1: die Überschrift der Seite ist die des Abschnitts. */}
      <Text as="p" size={500} weight="semibold">
        {title}
      </Text>
      {subtitle ? <Caption1 className="text-muted-foreground truncate">{subtitle}</Caption1> : null}
    </div>
  );

  if (narrow) {
    if (atIndex && !indexPage) {
      return (
        <nav aria-label={ariaLabel} className="mx-auto flex w-full max-w-xl flex-col gap-4">
          {heading}
          {visibleGroups.map((group, index) => (
            <section key={group.titleKey ?? index} className="flex flex-col">
              {group.titleKey ? (
                <Text
                  as="h2"
                  size={200}
                  weight="semibold"
                  className="text-muted-foreground px-3 pb-1"
                >
                  {t(group.titleKey)}
                </Text>
              ) : null}
              {group.items.map((item) => (
                <MobileLink key={item.to} item={item} />
              ))}
            </section>
          ))}
        </nav>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        {atIndex ? null : (
          <div>
            <Button
              as="a"
              href={backLink.href}
              onClick={backLink.onClick}
              appearance="subtle"
              icon={<ChevronLeft20Regular />}
            >
              {title}
            </Button>
          </div>
        )}
        {/* Mit eigener Startseite listet die Übersicht die Abschnitte selbst. */}
        <Outlet />
      </div>
    );
  }

  if (atIndex && !indexPage && items[0]) {
    return <Navigate to={items[0].to} replace />;
  }

  return (
    <div className="flex items-start gap-8">
      <aside className="sticky top-20 flex w-60 shrink-0 flex-col">
        {heading}
        <Nav
          aria-label={ariaLabel}
          selectedValue={selected?.to ?? ''}
          className={styles.nav}
          density="small"
        >
          {visibleGroups.map((group, index) => (
            <Fragment key={group.titleKey ?? index}>
              {index > 0 && !group.titleKey ? <NavDivider /> : null}
              {group.titleKey ? (
                <NavSectionHeader className={styles.sectionHeader}>
                  {t(group.titleKey)}
                </NavSectionHeader>
              ) : null}
              {group.items.map((item) => (
                <SubNavLink key={item.to} item={item} selected={item.to === selected?.to} />
              ))}
            </Fragment>
          ))}
        </Nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

/**
 * Inhalt eines Abschnitts: Überschrift, Beschreibung, Karten. Begrenzte
 * Breite, damit Formulare nicht über den ganzen Bildschirm laufen.
 */
export function SubPage({
  title,
  description,
  actions,
  wide = false,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Tabellen (Kostenstellen, Katalog) dürfen die volle Breite nutzen. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={wide ? 'flex flex-col gap-4' : 'flex max-w-3xl flex-col gap-4'}>
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </section>
  );
}
