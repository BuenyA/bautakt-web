import {
  AppItem,
  Avatar,
  Button,
  Hamburger,
  makeStyles,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
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
  Alert20Regular,
  PanelLeftContract20Regular,
  PanelLeftExpand20Regular,
  SignOut20Regular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';

import { type Theme } from '@/app/ThemeContext';
import { useTheme } from '@/app/useTheme';
import { BautaktSignet } from '@/components/brand/BautaktSignet';
import { useRouterLink } from '@/components/common/useRouterLink';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { HOME_ROUTE } from '@/lib/routes';

import { isNavActive, maySee, navItems, settingsNavItem } from './navItems';
import { QuickSearch } from './QuickSearch';
import { SidebarNavItem } from './SidebarNav';
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
 * Fluents `NavDrawer` mit seinen eigenen Farben und Abständen. Eigene Regeln
 * gibt es nur für die eingeklappte Icon-Leiste: Fluent setzt die Breite des
 * Drawers fest auf 260 px, eine schmale Variante kennt er nicht.
 */
const useStyles = makeStyles({
  drawer: {
    height: '100%',
  },
  rail: {
    width: '68px',
    minWidth: '68px',
  },
  // Eingeklappt: kein seitliches Polster, die Einträge stehen als 44-px-Quadrate
  // mittig. Fluents Body hat links 10 und rechts 4 px Einzug; mit diesem Versatz
  // saß jedes Icon links in seiner Hover-Fläche.
  railItems: {
    paddingInline: 0,
    alignItems: 'center',
  },
  railItem: {
    width: '44px',
    minWidth: '44px',
    paddingInline: 0,
    justifyContent: 'center',
    marginInline: 'auto',
    overflow: 'visible',
    // Fluents Auswahl-Balken (`::after`) sitzt mit festem Versatz im Eintrag.
    // Im 44-px-Quadrat landete er im Icon; hier steht er links außerhalb, am
    // Rand der Leiste wie im ausgeklappten Zustand (Eintrag 12 px vom Rand).
    '::after': {
      left: '-8px',
      marginInlineStart: 0,
    },
  },
  // Kopf der Leiste: Signet und Name links, Einklappen rechts, eine Zeile.
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingInlineStart: '10px',
    paddingInlineEnd: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalS,
  },
  headerRail: {
    flexDirection: 'column',
    paddingInline: 0,
    gap: tokens.spacingVerticalXS,
  },
  appItem: {
    flexGrow: 1,
    minWidth: 0,
  },
  // Fluents Footer hat kein Polster; dieselben Einzüge wie der Body (10 / 4 px),
  // damit „Einstellungen“ mit den übrigen Einträgen fluchtet, und Luft nach unten.
  footer: {
    paddingInlineStart: '10px',
    paddingInlineEnd: '4px',
    paddingBottom: tokens.spacingVerticalM,
    gap: tokens.spacingVerticalXS,
  },
  personaButton: {
    width: '100%',
    maxWidth: 'none',
    justifyContent: 'flex-start',
    paddingBlock: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalS,
    minHeight: '48px',
  },
  // Avatar als Inhalt, nicht als Icon: der Icon-Slot ist 20 px und schnitt den
  // 32-px-Kreis links und rechts ab.
  railButton: {
    minWidth: 'auto',
    width: '44px',
    height: '44px',
    padding: 0,
  },
});

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { signOut, user } = useAuth();
  const { data: membership } = useMembership();
  const { theme, setTheme } = useTheme();

  const email = user?.email ?? '';
  const company = membership?.companyName ?? '';
  const initials = email.slice(0, 2).toUpperCase() || '??';

  const trigger = collapsed ? (
    <Button appearance="subtle" className={styles.railButton} aria-label={email}>
      <Avatar initials={initials} color="brand" size={32} />
    </Button>
  ) : (
    <Button appearance="subtle" className={styles.personaButton}>
      <Persona
        name={company || email}
        secondaryText={company ? email : undefined}
        avatar={{ initials, color: 'brand' }}
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
      aria-label={collapsed ? name : undefined}
      className={className}
    >
      {collapsed ? null : name}
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

  const collapsed = !isMobile && !expanded;
  const visible = navItems.filter((item) => maySee(item, membership?.permissions));
  const selected = [...visible, settingsNavItem].find((item) => isNavActive(pathname, item))?.to;
  const closeMobile = isMobile ? () => setMobileOpen(false) : undefined;
  const toggleLabel = t('common:nav.toggleSidebar');
  const collapseLabel = collapsed ? t('common:nav.expandSidebar') : t('common:nav.collapseSidebar');

  function toggle() {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    setExpanded((current) => {
      writeExpanded(!current);
      return !current;
    });
  }

  const drawer = (
    <NavDrawer
      type={isMobile ? 'overlay' : 'inline'}
      open={isMobile ? mobileOpen : true}
      onOpenChange={(_, data) => setMobileOpen(data.open)}
      selectedValue={selected ?? ''}
      className={mergeClasses(styles.drawer, collapsed && styles.rail)}
    >
      <NavDrawerHeader className={mergeClasses(styles.header, collapsed && styles.headerRail)}>
        <AppTitle
          collapsed={collapsed}
          onNavigate={closeMobile}
          className={collapsed ? styles.railItem : styles.appItem}
        />
        <Tooltip content={collapseLabel} relationship="label" positioning="after">
          <Button
            appearance="subtle"
            icon={collapsed ? <PanelLeftExpand20Regular /> : <PanelLeftContract20Regular />}
            onClick={toggle}
            aria-expanded={isMobile ? mobileOpen : expanded}
          />
        </Tooltip>
      </NavDrawerHeader>

      <NavDrawerBody className={collapsed ? styles.railItems : undefined}>
        {visible.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onNavigate={closeMobile}
            className={collapsed ? styles.railItem : undefined}
          />
        ))}
      </NavDrawerBody>

      <NavDrawerFooter className={mergeClasses(styles.footer, collapsed && styles.railItems)}>
        <SidebarNavItem
          item={settingsNavItem}
          collapsed={collapsed}
          onNavigate={closeMobile}
          className={collapsed ? styles.railItem : undefined}
        />
        <NavDivider />
        <UserMenu collapsed={collapsed} />
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
          <div className="flex min-w-0 flex-1">
            <QuickSearch />
          </div>

          <div className="flex items-center gap-2">
            <Tooltip content={t('common:nav.notificationsComingSoon')} relationship="description">
              <Button
                appearance="subtle"
                icon={<Alert20Regular />}
                aria-label={t('common:nav.notifications')}
              />
            </Tooltip>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
