import {
  Avatar,
  AvatarFallback,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  Uicon,
  useSidebar,
} from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';

import { type Theme } from '@/app/ThemeContext';
import { useTheme } from '@/app/useTheme';
import { BautaktLogo } from '@/components/brand/BautaktLogo';
import { BautaktSignet } from '@/components/brand/BautaktSignet';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { HOME_ROUTE } from '@/lib/routes';

import { Breadcrumbs } from './Breadcrumbs';
import { settingsNavItem } from './navItems';
import { SidebarNav } from './SidebarNav';

/** Zustand der Leiste aus dem Cookie, damit sie beim Laden nicht springt. */
function readSidebarCookie(): boolean {
  const match = document.cookie.match(/(?:^|;\s*)bautakt_sidebar_state=(true|false)/);
  return match ? match[1] === 'true' : true;
}

function BrandHeader() {
  const { t } = useTranslation();
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;

  return (
    <SidebarHeader className={cn('h-14 justify-center', collapsed && 'items-center px-0')}>
      <Link
        to={HOME_ROUTE}
        className={cn('flex items-center rounded-md', collapsed ? 'justify-center' : 'px-2.5')}
        aria-label={t('common:app.name')}
      >
        {collapsed ? <BautaktSignet className="size-7" /> : <BautaktLogo />}
      </Link>
    </SidebarHeader>
  );
}

function UserMenu() {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const { data: membership } = useMembership();
  const { theme, setTheme } = useTheme();
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;

  const email = user?.email ?? '';
  const initials = email.slice(0, 2).toUpperCase() || '??';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" tooltip={email}>
          <Avatar className="size-7">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {collapsed ? null : (
            <span className="flex min-w-0 flex-col text-left">
              <span className="text-foreground truncate text-sm font-medium">{email}</span>
              {membership?.companyName ? (
                <span className="text-text-subtle truncate text-xs">{membership.companyName}</span>
              ) : null}
            </span>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('common:theme.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          <DropdownMenuRadioItem value="light">{t('common:theme.light')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{t('common:theme.dark')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">{t('common:theme.system')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <Uicon name="sign-out-alt" size={16} />
          {t('common:action.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { data: membership } = useMembership();

  return (
    <SidebarProvider defaultOpen={readSidebarCookie()}>
      <Sidebar collapsible="icon">
        <BrandHeader />
        <SidebarSeparator />

        <SidebarContent>
          <SidebarNav />
        </SidebarContent>

        <SidebarSeparator />
        <SidebarFooter>
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t(settingsNavItem.labelKey)}>
                    <Link to={settingsNavItem.to}>
                      <Uicon name={settingsNavItem.icon} size={18} />
                      <span>{t(settingsNavItem.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <UserMenu />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="border-border bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          <Breadcrumbs className="hidden min-w-0 sm:flex" />

          <span className="text-muted-foreground ml-auto hidden truncate text-sm lg:block">
            {membership?.companyName}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label={t('common:nav.notifications')}
            title={t('common:nav.notificationsComingSoon')}
          >
            <Uicon name="bell" size={18} />
          </Button>
        </header>

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
