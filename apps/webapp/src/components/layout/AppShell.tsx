import { cn } from '@bautakt/ui';
import {
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
  NavDrawer,
  NavDrawerBody,
  NavDrawerFooter,
  NavDrawerHeader,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { AlertRegular, SignOutRegular } from '@fluentui/react-icons';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router';

import { type Theme } from '@/app/ThemeContext';
import { useTheme } from '@/app/useTheme';
import { BautaktLogo } from '@/components/brand/BautaktLogo';
import { BautaktSignet } from '@/components/brand/BautaktSignet';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { HOME_ROUTE } from '@/lib/routes';

import { Breadcrumbs } from './Breadcrumbs';
import { isNavActive, maySee, navItems, settingsNavItem } from './navItems';
import { SidebarNavItem } from './SidebarNav';
import { useMediaQuery } from './useMediaQuery';

const COOKIE = 'bautakt_sidebar_state';
const EXPANDED_WIDTH = '260px';
const RAIL_WIDTH = '64px';

/** Zustand der Leiste aus dem Cookie, damit sie beim Laden nicht springt. */
function readExpanded(): boolean {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=(true|false)`));
  return match ? match[1] === 'true' : true;
}

function writeExpanded(expanded: boolean) {
  document.cookie = `${COOKIE}=${expanded}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Seitenleiste neutral (`colorNeutralBackground2`) mit Rahmen, wie in der
 * Owner-Vorgabe. Der aktive Eintrag trägt Fluents eigene Auswahl: neutrale
 * Fläche plus Brand-Indikator.
 */
const useStyles = makeStyles({
  drawer: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    height: '100%',
  },
  // Fluents Button ist auf 280 px begrenzt und zentriert; hier füllt er die Leiste.
  userButton: {
    width: '100%',
    maxWidth: 'none',
    justifyContent: 'flex-start',
  },
});

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { signOut, user } = useAuth();
  const { data: membership } = useMembership();
  const { theme, setTheme } = useTheme();

  const email = user?.email ?? '';
  const initials = email.slice(0, 2).toUpperCase() || '??';

  const trigger = (
    <Button
      appearance="subtle"
      className={collapsed ? undefined : styles.userButton}
      aria-label={collapsed ? email : undefined}
      icon={<Avatar initials={initials} size={28} color="neutral" />}
    >
      {collapsed ? null : (
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-sm font-medium">{email}</span>
          {membership?.companyName ? (
            <span className="text-text-subtle truncate text-xs font-normal">
              {membership.companyName}
            </span>
          ) : null}
        </span>
      )}
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
            <MenuGroupHeader className="truncate">{email}</MenuGroupHeader>
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
          <MenuItem icon={<SignOutRegular />} onClick={() => void signOut()}>
            {t('common:action.signOut')}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

/**
 * Rahmen der angemeldeten App: Seitenleiste, Kopfzeile, Inhalt.
 *
 * Desktop: Fluent-`NavDrawer` inline, per Hamburger einklappbar auf eine
 * Icon-Leiste; der Zustand steht im Cookie. Unter 768 px: dieselbe Leiste als
 * Overlay, die sich nach dem Navigieren schließt.
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
      className={styles.drawer}
      style={
        {
          '--fui-Drawer--size': collapsed ? RAIL_WIDTH : EXPANDED_WIDTH,
        } as CSSProperties
      }
    >
      <NavDrawerHeader className="h-14 justify-center">
        <Link
          to={HOME_ROUTE}
          onClick={closeMobile}
          className={cn('flex items-center rounded-md', collapsed ? 'justify-center' : 'px-2.5')}
          aria-label={t('common:app.name')}
        >
          {collapsed ? <BautaktSignet className="size-7" /> : <BautaktLogo />}
        </Link>
      </NavDrawerHeader>

      <NavDrawerBody>
        {visible.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        ))}
      </NavDrawerBody>

      <NavDrawerFooter>
        <SidebarNavItem item={settingsNavItem} collapsed={collapsed} onNavigate={closeMobile} />
        <UserMenu collapsed={collapsed} />
      </NavDrawerFooter>
    </NavDrawer>
  );

  return (
    <div className="flex min-h-svh">
      {isMobile ? drawer : <div className="sticky top-0 h-svh shrink-0">{drawer}</div>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3">
          <Hamburger
            onClick={toggle}
            aria-label={t('common:nav.toggleSidebar')}
            aria-expanded={isMobile ? mobileOpen : expanded}
          />
          <div className="hidden min-w-0 sm:flex">
            <Breadcrumbs />
          </div>

          <span className="text-muted-foreground ml-auto hidden truncate text-sm lg:block">
            {membership?.companyName}
          </span>

          <Button
            appearance="subtle"
            icon={<AlertRegular />}
            aria-label={t('common:nav.notifications')}
            title={t('common:nav.notificationsComingSoon')}
            className="max-lg:ml-auto"
          />
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
