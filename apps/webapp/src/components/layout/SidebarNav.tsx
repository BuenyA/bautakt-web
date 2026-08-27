import { hasPermission } from '@bautakt/core';
import { cn } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { useMembership } from '@/features/company/useMembership';

import { navItems } from './navItems';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();

  const visible = navItems.filter(
    (item) => !item.permission || hasPermission(membership?.permissions, item.permission),
  );

  return (
    <nav aria-label={t('common:nav.main')} className="flex flex-col gap-1">
      {visible.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-surface hover:text-foreground',
            )
          }
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
