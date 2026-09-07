import { Button } from '@bautakt/ui';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';

import { BautaktLogo } from '@/components/brand/BautaktLogo';
import { BautaktSignet } from '@/components/brand/BautaktSignet';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { HOME_ROUTE } from '@/lib/routes';

import { SidebarNav } from './SidebarNav';

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="size-5"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function SidebarChrome({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const { data: membership } = useMembership();

  return (
    <div className={className}>
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Link
          to={HOME_ROUTE}
          onClick={onNavigate}
          className="inline-flex items-center"
          aria-label={t('common:app.name')}
        >
          <BautaktLogo className="hidden sm:block" />
          <BautaktSignet className="sm:hidden" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 border-t border-border p-3">
        {membership?.companyName ? (
          <div className="truncate px-3 text-xs text-muted-foreground">
            {membership.companyName}
          </div>
        ) : null}
        {user?.email ? (
          <div className="mt-1 truncate px-3 text-sm font-medium text-foreground">{user.email}</div>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start"
          onClick={() => void signOut()}
        >
          {t('common:action.signOut')}
        </Button>
      </div>
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerTitleId = useId();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <SidebarChrome className="flex h-full flex-col" />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label={t('common:nav.closeMenu')}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            className="absolute inset-y-0 left-0 flex w-60 max-w-[85vw] flex-col bg-sidebar shadow-lg"
          >
            <span id={drawerTitleId} className="sr-only">
              {t('common:nav.main')}
            </span>
            <SidebarChrome
              className="flex h-full flex-col"
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-expanded={mobileOpen}
            aria-label={t(mobileOpen ? 'common:nav.closeMenu' : 'common:nav.openMenu')}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <MenuIcon open={mobileOpen} />
          </Button>

          <Link
            to={HOME_ROUTE}
            className="inline-flex items-center lg:hidden"
            aria-label={t('common:app.name')}
          >
            <BautaktSignet className="size-7" />
          </Link>

          <span className="ml-auto truncate text-sm text-muted-foreground">
            {membership?.companyName}
          </span>

          <Button
            variant="ghost"
            size="icon"
            aria-label={t('common:nav.notifications')}
            title={t('common:nav.notificationsComingSoon')}
          >
            <BellIcon />
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
