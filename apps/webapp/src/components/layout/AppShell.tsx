import {
  AppItem,
  Button,
  Hamburger,
  makeStyles,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  MenuItemLink,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  mergeClasses,
  NavDivider,
  NavDrawer,
  NavDrawerBody,
  NavDrawerFooter,
  NavDrawerHeader,
  Persona,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  Document20Regular,
  PanelLeftContract20Regular,
  PanelLeftExpand20Regular,
  Settings20Regular,
  SignOut20Regular,
} from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';

import { type Theme } from '@/app/ThemeContext';
import { useTheme } from '@/app/useTheme';
import { BautaktSignet } from '@/components/brand/BautaktSignet';
import { useRouterLink } from '@/components/common/useRouterLink';
import { useAuth } from '@/features/auth/useAuth';
import { useMyProfile } from '@/features/auth/useMyProfile';
import { useMembership } from '@/features/company/useMembership';
import { useProfileImageUrls } from '@/features/team/useProfileImageUrls';
import { LEGAL_PAGES, legalUrl } from '@/lib/legal';
import { HOME_ROUTE } from '@/lib/routes';

import { calendarNavItem, isNavActive, maySee, navItems, settingsNavItem } from './navItems';
import { NotificationsBell } from './NotificationsBell';
import { QuickSearch } from './QuickSearch';
import { SidebarNavItem } from './SidebarNav';
import {
  RAIL_WIDTH,
  SIDEBAR_DURATION,
  SIDEBAR_EASE,
  SIDEBAR_INSET,
  useSidebarStyles,
} from './sidebarStyles';
import { useMediaQuery } from './useMediaQuery';
import { useRailTooltip } from './useRailTooltip';

/** Größe des Umschalters. */
const TOGGLE_SIZE = 32;
/** Höhe der Kopfzeile der Leiste (Signet-Zeile). */
const HEAD_HEIGHT = 56;
/** Eingeklappt: Zeile unter dem Signet mit Ausklappen und Trennlinie. */
const RAIL_ROW_HEIGHT = TOGGLE_SIZE + 8 + 1 + 8;
/** Mitte der ersten Zeile (Signet), auf Höhe der Kopfzeile rechts daneben. */
const HEAD_CENTER = 28;

const COOKIE = 'bautakt_sidebar_state';

/** Zustand der Leiste aus dem Cookie, damit sie beim Laden nicht springt. */
function readExpanded(): boolean {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=(true|false)`));
  return match ? match[1] === 'true' : true;
}

function writeExpanded(expanded: boolean) {
  document.cookie = `${COOKIE}=${expanded}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Fluents `NavDrawer` mit seinen eigenen Farben. Fluent setzt die Breite fest
 * auf 260 px und kennt keine schmale Variante; die Icon-Leiste und die Bewegung
 * dazwischen kommen von hier und aus `sidebarStyles`.
 */
const useStyles = makeStyles({
  drawer: {
    height: '100%',
    // `clip` statt `hidden`: abgeschnitten, aber nie gescrollt — auch nicht,
    // wenn der Browser einen fokussierten, verdeckten Knopf ins Bild holen will.
    overflow: 'clip',
  },
  rail: {
    width: `${RAIL_WIDTH}px`,
  },
  // Kopf: Signet und Name. Eingeklappt bleibt nur das Signet sichtbar, der
  // Name liegt abgeschnitten rechts davon.
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    // Fluent setzt `paddingInlineStart: 14px` und `paddingBlock: 5px` eigens;
    // dieselben Schlüssel hier, damit sie überschrieben werden.
    paddingInlineStart: `${SIDEBAR_INSET}px`,
    // Rechts Platz für den Umschalter, der über dem Kopf liegt.
    paddingInlineEnd: `${SIDEBAR_INSET + TOGGLE_SIZE + 4}px`,
    paddingBlock: tokens.spacingVerticalS,
    overflow: 'clip',
  },
  // Signet 24 px mit 10 px Einzug: Mitte auf der Mittellinie der Icon-Leiste.
  appItem: {
    // Fluent rückt das `AppItem` um −6 px ein; hier sitzt es bündig im Kopf.
    marginInlineStart: 0,
    flex: '1 0 44px',
    minWidth: '44px',
    paddingInlineStart: '10px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    // Eingeklappt ist der Eintrag genau 44 px breit; ohne das würde das
    // 24-px-Signet zugunsten von Abstand und Innenrand gestaucht.
    '& .fui-AppItem__icon': {
      flexShrink: 0,
    },
  },
  // Ein- und Ausklappen: ein Knopf für beide Zustände. Ausgeklappt steht er
  // rechts im Kopf; eingeklappt gleitet er unter das Signet. Er liegt über dem
  // Drawer, damit er beim Umschalten derselbe bleibt (Fokus, Bewegung).
  toggle: {
    position: 'absolute',
    insetInlineEnd: `${SIDEBAR_INSET}px`,
    top: `${HEAD_CENTER - TOGGLE_SIZE / 2}px`,
    width: `${TOGGLE_SIZE}px`,
    minWidth: `${TOGGLE_SIZE}px`,
    height: `${TOGGLE_SIZE}px`,
    padding: 0,
    transitionProperty: 'inset-inline-end, top',
    transitionDuration: SIDEBAR_DURATION,
    transitionTimingFunction: SIDEBAR_EASE,
    '@media (prefers-reduced-motion: reduce)': {
      transitionDuration: '0.01ms',
    },
  },
  // Mitte auf der Mittellinie der Icon-Leiste, direkt unter dem Signet.
  toggleInRail: {
    insetInlineEnd: `${(RAIL_WIDTH - TOGGLE_SIZE) / 2}px`,
    top: `${HEAD_HEIGHT}px`,
  },
  // Platz für das Ausklappen samt Trennlinie darunter; wächst beim Einklappen
  // auf, damit die Einträge weich nach unten rutschen statt zu springen.
  railRow: {
    flexShrink: 0,
    height: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end',
    paddingInline: `${SIDEBAR_INSET}px`,
    transitionProperty: 'height',
    transitionDuration: SIDEBAR_DURATION,
    transitionTimingFunction: SIDEBAR_EASE,
    '@media (prefers-reduced-motion: reduce)': {
      transitionDuration: '0.01ms',
    },
  },
  railRowOpen: {
    height: `${RAIL_ROW_HEIGHT}px`,
  },
  // Gleicher Abstand über und unter der Linie (8 px).
  railDivider: {
    flexGrow: 1,
    marginBottom: tokens.spacingVerticalS,
    height: tokens.strokeWidthThin,
    backgroundColor: tokens.colorNeutralStroke2,
  },
  body: {
    paddingInline: `${SIDEBAR_INSET}px`,
    // Beim Schmalerwerden steht Inhalt kurz seitlich über; ohne das blitzte
    // unten im Body ein Scrollbalken auf.
    overflowX: 'hidden',
  },
  footer: {
    // Kurzform wie im Kopf, sonst gewinnt Fluents `padding: 0`.
    padding: `0 ${SIDEBAR_INSET}px ${tokens.spacingVerticalM}`,
    gap: tokens.spacingVerticalXS,
    overflow: 'clip',
  },
  // Ein Knopf für beide Zustände. Avatar 32 px, 5 px Einzug plus 1 px Rand:
  // Mitte auf der Mittellinie der Icon-Leiste.
  personaButton: {
    width: '100%',
    minWidth: 0,
    maxWidth: 'none',
    justifyContent: 'flex-start',
    paddingBlock: tokens.spacingVerticalS,
    paddingInlineStart: '5px',
    paddingInlineEnd: tokens.spacingHorizontalS,
    minHeight: '48px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
});

function UserMenu({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const sidebar = useSidebarStyles();
  const { signOut, user } = useAuth();
  const settingsLink = useRouterLink(settingsNavItem.to);
  const { data: membership } = useMembership();
  const { theme, setTheme } = useTheme();

  const { data: profile } = useMyProfile();
  const imagePath = profile?.imagePath ?? null;
  const imageUrl = useProfileImageUrls([imagePath]).data?.[imagePath ?? ''];

  const email = user?.email ?? '';
  const company = membership?.companyName ?? '';
  // Mit Namen bildet Fluent die Initialen selbst („Bünyamin Aydemir“ → BA);
  // ohne Namen die ersten zwei Buchstaben der E-Mail.
  const avatar = {
    name: profile?.name || undefined,
    initials: profile?.name ? undefined : email.slice(0, 2).toUpperCase() || '??',
    image: imageUrl ? { src: imageUrl } : undefined,
    color: 'brand' as const,
  };

  const tooltip = useRailTooltip(collapsed);
  const labelClass = mergeClasses(sidebar.label, collapsed && sidebar.labelHidden);
  const trigger = (
    <Button
      appearance="subtle"
      className={styles.personaButton}
      aria-label={collapsed ? email : undefined}
    >
      <Persona
        primaryText={{ children: company || email, className: labelClass }}
        secondaryText={company ? { children: email, className: labelClass } : undefined}
        avatar={avatar}
        size="medium"
        textAlignment="center"
        className="min-w-0 text-left"
      />
    </Button>
  );

  return (
    <Menu
      positioning="above-start"
      checkedValues={{ theme: [theme] }}
      onCheckedValueChange={(_, data) => {
        if (data.name === 'theme' && data.checkedItems[0]) setTheme(data.checkedItems[0] as Theme);
      }}
    >
      <MenuTrigger disableButtonEnhancement>
        <Tooltip content={email} {...tooltip}>
          {trigger}
        </Tooltip>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuGroup>
            <MenuGroupHeader>{email}</MenuGroupHeader>
          </MenuGroup>
          <MenuDivider />
          <MenuItemLink
            icon={<Settings20Regular />}
            href={settingsLink.href}
            onClick={(event) => {
              settingsLink.onClick(event);
              onNavigate?.();
            }}
          >
            {t(settingsNavItem.labelKey)}
          </MenuItemLink>
          <MenuDivider />
          <MenuGroup>
            <MenuGroupHeader>{t('common:theme.label')}</MenuGroupHeader>
            <MenuItemRadio name="theme" value="light">
              {t('common:theme.light')}
            </MenuItemRadio>
            <MenuItemRadio name="theme" value="dark">
              {t('common:theme.dark')}
            </MenuItemRadio>
            <MenuItemRadio name="theme" value="system">
              {t('common:theme.system')}
            </MenuItemRadio>
          </MenuGroup>
          <MenuDivider />
          {/* Rechtstexte leben auf der Marketing-Seite (#81), neuer Tab. */}
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuItem icon={<Document20Regular />}>{t('common:legal.label')}</MenuItem>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {LEGAL_PAGES.map((page) => (
                  <MenuItemLink
                    key={page}
                    href={legalUrl(page)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(`common:legal.${page}`)}
                    <span className="sr-only"> {t('common:legal.newTab')}</span>
                  </MenuItemLink>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
          <MenuDivider />
          <MenuItem icon={<SignOut20Regular />} onClick={() => void signOut()}>
            {t('common:action.signOut')}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

/** App-Name oben in der Leiste: Fluents `AppItem`, führt zur Übersicht. */
function AppTitle({
  collapsed,
  onNavigate,
  className,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const sidebar = useSidebarStyles();
  const link = useRouterLink(HOME_ROUTE);
  const name = t('common:app.name');
  return (
    <AppItem
      as="a"
      href={link.href}
      onClick={(event) => {
        link.onClick(event);
        onNavigate?.();
      }}
      icon={<BautaktSignet className="size-6" />}
      className={className}
    >
      <span className={mergeClasses(sidebar.label, collapsed && sidebar.labelHidden)}>{name}</span>
    </AppItem>
  );
}

/**
 * Rahmen der angemeldeten App: Seitenleiste, Kopfzeile, Inhalt.
 *
 * Kopf der Leiste: Signet und Name (`AppItem`), rechts das Einklappen.
 * Desktop: Drawer inline, einklappbar auf eine Icon-Leiste; eingeklappt sitzt
 * das Ausklappen unter dem Signet, darunter eine Trennlinie. Dazu Strg+B. Zustand im Cookie. Unter 768 px: Overlay, geöffnet über den
 * Hamburger in der Kopfzeile, schließt nach dem Navigieren. Die Kopfzeile
 * trägt die Schnellsuche und die Glocke.
 */
export function AppShell() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { data: membership } = useMembership();
  const { pathname } = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [expanded, setExpanded] = useState(readExpanded);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebar = useSidebarStyles();

  const collapsed = !isMobile && !expanded;
  const visible = navItems.filter((item) => maySee(item, membership?.permissions));
  const selected = [...visible, calendarNavItem].find((item) => isNavActive(pathname, item))?.to;
  const closeMobile = isMobile ? () => setMobileOpen(false) : undefined;
  const toggleLabel = t('common:nav.toggleSidebar');
  const toggleAction = t(collapsed ? 'common:nav.expandSidebar' : 'common:nav.collapseSidebar');

  function toggle() {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    setExpanded(!expanded);
    writeExpanded(!expanded);
  }

  // Strg+B (Mac: ⌘B) klappt die Leiste um, wie in VS Code. Nicht in
  // Eingabefeldern, dort kann es „fett“ heißen.
  useEffect(() => {
    if (isMobile) return;
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() !== 'b') return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, [contenteditable]')) {
        return;
      }
      event.preventDefault();
      setExpanded((current) => {
        writeExpanded(!current);
        return !current;
      });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile]);

  const drawer = (
    <NavDrawer
      type={isMobile ? 'overlay' : 'inline'}
      open={isMobile ? mobileOpen : true}
      onOpenChange={(_, data) => setMobileOpen(data.open)}
      selectedValue={selected ?? ''}
      className={mergeClasses(
        styles.drawer,
        !isMobile && sidebar.drawerMotion,
        collapsed && styles.rail,
      )}
    >
      <NavDrawerHeader className={styles.header}>
        <AppTitle collapsed={collapsed} onNavigate={closeMobile} className={styles.appItem} />
      </NavDrawerHeader>
      {isMobile ? null : (
        <div className={mergeClasses(styles.railRow, collapsed && styles.railRowOpen)}>
          <div className={styles.railDivider} />
        </div>
      )}

      <NavDrawerBody className={styles.body}>
        {visible.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        ))}
      </NavDrawerBody>

      <NavDrawerFooter className={styles.footer}>
        <SidebarNavItem item={calendarNavItem} collapsed={collapsed} onNavigate={closeMobile} />
        <NavDivider />
        <UserMenu collapsed={collapsed} onNavigate={closeMobile} />
      </NavDrawerFooter>
    </NavDrawer>
  );

  return (
    <div className="flex min-h-svh">
      {isMobile ? (
        drawer
      ) : (
        <div className="sticky top-0 h-svh shrink-0">
          {drawer}
          <Tooltip
            content={`${toggleAction} (${t('common:nav.sidebarShortcut')})`}
            relationship="description"
            positioning="after"
          >
            <Button
              appearance="subtle"
              icon={collapsed ? <PanelLeftExpand20Regular /> : <PanelLeftContract20Regular />}
              onClick={toggle}
              aria-label={toggleAction}
              aria-expanded={expanded}
              aria-keyshortcuts="Control+B"
              className={mergeClasses(styles.toggle, collapsed && styles.toggleInRail)}
            />
          </Tooltip>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          {isMobile ? (
            <Hamburger onClick={toggle} aria-label={toggleLabel} aria-expanded={mobileOpen} />
          ) : null}
          {/* Rechtsbündig: Glocke links neben der Suche, die Suche ganz rechts. */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <NotificationsBell />
            <div className="flex max-w-md min-w-0 flex-1">
              <QuickSearch />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
