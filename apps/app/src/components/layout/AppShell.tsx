import { Button } from '@bautakt/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';

import { SidebarNav } from './SidebarNav';

export function AppShell() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { data: membership } = useMembership();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-expanded={mobileOpen}
          aria-label={t(mobileOpen ? 'common:nav.closeMenu' : 'common:nav.openMenu')}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span aria-hidden="true">{mobileOpen ? '✕' : '☰'}</span>
        </Button>

        <span className="font-semibold tracking-tight">{t('common:app.name')}</span>

        <span className="ml-auto truncate text-sm text-muted-foreground">
          {membership?.companyName}
        </span>

        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          {t('common:action.signOut')}
        </Button>
      </header>

      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r p-4 lg:block">
          <SidebarNav />
        </aside>

        {mobileOpen ? (
          <aside className="fixed inset-x-0 top-16 z-30 border-b bg-background p-4 lg:hidden">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
