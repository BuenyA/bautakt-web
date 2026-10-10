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
import { Alert20Regular, SignOut20Regular } from '@fluentui/react-icons';
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

import { Breadcrumbs } from './Breadcrumbs';
import { isNavActive, maySee, navItems, settingsNavItem } from './navItems';
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
  railItems: {
    paddingInline: tokens.spacingHorizontalS,
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
  railButton: {
    minWidth: 'auto',
    paddingBlock: tokens.spacingVerticalS,
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
    <Button
      appearance="subtle"
      className={styles.railButton}
      aria-label={email}
      icon={<Avatar initials={initials} color="brand" size={32} />}
    />
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
function AppTitle({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
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
    >
      {collapsed ? null : name}
    </AppItem>
  );
}

/**
 * Rahmen der angemeldeten App: Seitenleiste, Kopfzeile, Inhalt.
 *
 * Aufbau nach Fluents Muster: der `Hamburger` steht oben in der Leiste, darunter
 * der App-Name (`AppItem`) und die Einträge. Desktop: Drawer inline, per
 * Hamburger auf eine Icon-Leiste einklappbar, Zustand im Cookie. Unter 768 px:
 * Overlay, geöffnet über den Hamburger in der Kopfzeile, schließt nach dem
 * Navigieren.
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
      <NavDrawerHeader>
        <Tooltip content={toggleLabel} relationship="label" positioning="after">
          <Hamburger onClick={toggle} aria-expanded={isMobile ? mobileOpen : expanded} />
        </Tooltip>
      </NavDrawerHeader>

      <NavDrawerBody className={collapsed ? styles.railItems : undefined}>
        <AppTitle collapsed={collapsed} onNavigate={closeMobile} />
        {visible.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        ))}
      </NavDrawerBody>

      <NavDrawerFooter className={mergeClasses(styles.footer, collapsed && styles.railItems)}>
        <SidebarNavItem item={settingsNavItem} collapsed={collapsed} onNavigate={closeMobile} />
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
          <div className="hidden min-w-0 sm:flex">
            <Breadcrumbs />
          </div>

          <div className="ml-auto flex items-center gap-2">
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
