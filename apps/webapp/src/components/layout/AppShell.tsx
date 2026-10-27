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
import { useEffect, useRef, useState } from 'react';
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
import { RAIL_WIDTH, SIDEBAR_INSET, useSidebarStyles } from './sidebarStyles';
import { useMediaQuery } from './useMediaQuery';

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
  // Kopf: Signet und Name links, Einklappen rechts, eine Zeile in beiden
  // Zuständen. Eingeklappt bleibt nur das Signet sichtbar, der Rest liegt
  // abgeschnitten rechts davon.
  header: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    // Fluent setzt `paddingInlineStart: 14px` und `paddingBlock: 5px` eigens;
    // dieselben Schlüssel hier, damit sie überschrieben werden.
    paddingInlineStart: `${SIDEBAR_INSET}px`,
    paddingInlineEnd: `${SIDEBAR_INSET}px`,
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
  collapseButton: {
    flexShrink: 0,
  },
  // Eingeklappt liegt das Ausklappen genau auf dem Signet und erscheint beim
  // Überfahren (wie bei ChatGPT/Claude) — eine Spalte, kein zweites Symbol.
  expandButton: {
    position: 'absolute',
    insetInlineStart: `${SIDEBAR_INSET}px`,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '44px',
    minWidth: '44px',
    height: '44px',
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
        {collapsed ? (
          <Tooltip content={email} relationship="description" positioning="after">
            {trigger}
          </Tooltip>
        ) : (
          trigger
        )}
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
 * Kopf der Leiste in einer Zeile: Signet und Name (`AppItem`) links, rechts
 * das Einklapp-Symbol. Desktop: Drawer inline, einklappbar auf eine
 * Icon-Leiste, Zustand im Cookie. Unter 768 px: Overlay, geöffnet über den
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
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const toggledByUser = useRef(false);

  // Nach dem Umschalten wandert der Fokus auf den Knopf, der jetzt sichtbar
  // ist — sonst bliebe er auf dem ausgeblendeten hängen.
  useEffect(() => {
    if (!toggledByUser.current) return;
    (expanded ? collapseRef : expandRef).current?.focus({ preventScroll: true });
  }, [expanded]);

  const collapsed = !isMobile && !expanded;
  const visible = navItems.filter((item) => maySee(item, membership?.permissions));
  const selected = [...visible, calendarNavItem].find((item) => isNavActive(pathname, item))?.to;
  const closeMobile = isMobile ? () => setMobileOpen(false) : undefined;
  const toggleLabel = t('common:nav.toggleSidebar');

  function toggle() {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    toggledByUser.current = true;
    setExpanded(!expanded);
    writeExpanded(!expanded);
  }

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
      <NavDrawerHeader className={mergeClasses(styles.header, 'group/sidebar-head')}>
        <AppTitle
          collapsed={collapsed}
          onNavigate={closeMobile}
          className={mergeClasses(
            styles.appItem,
            // Eingeklappt weicht das Signet beim Überfahren (oder Tastaturfokus
            // auf dem Ausklappen) dem Ausklappen-Symbol.
            collapsed &&
              'transition-opacity duration-150 group-hover/sidebar-head:opacity-0 group-has-[:focus-visible]/sidebar-head:opacity-0',
          )}
        />
        <Tooltip content={t('common:nav.collapseSidebar')} relationship="label" positioning="after">
          <Button
            ref={collapseRef}
            appearance="subtle"
            icon={<PanelLeftContract20Regular />}
            onClick={toggle}
            aria-expanded={isMobile ? mobileOpen : expanded}
            // Eingeklappt liegt der Knopf abgeschnitten neben dem Signet: aus
            // der Tab-Reihenfolge nehmen, das Ausklappen übernimmt.
            tabIndex={collapsed ? -1 : undefined}
            aria-hidden={collapsed || undefined}
            className={mergeClasses(
              styles.collapseButton,
              sidebar.label,
              collapsed && sidebar.labelHidden,
            )}
          />
        </Tooltip>
        {collapsed ? (
          <Tooltip content={t('common:nav.expandSidebar')} relationship="label" positioning="after">
            <Button
              ref={expandRef}
              appearance="subtle"
              icon={<PanelLeftExpand20Regular />}
              onClick={toggle}
              aria-expanded={false}
              className={mergeClasses(
                styles.expandButton,
                'opacity-0 transition-opacity duration-150 group-hover/sidebar-head:opacity-100 focus-visible:opacity-100',
              )}
            />
          </Tooltip>
        ) : null}
      </NavDrawerHeader>

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
      {isMobile ? drawer : <div className="sticky top-0 h-svh shrink-0">{drawer}</div>}

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
