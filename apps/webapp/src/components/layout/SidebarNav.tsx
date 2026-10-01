import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Uicon,
} from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';

import { useMembership } from '@/features/company/useMembership';

import { isNavActive, maySee, navItems } from './navItems';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const { pathname } = useLocation();

  const visible = navItems.filter((item) => maySee(item, membership?.permissions));

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                asChild
                tooltip={t(item.labelKey)}
                isActive={isNavActive(pathname, item)}
              >
                <NavLink to={item.to} onClick={onNavigate}>
                  <Uicon name={item.icon} size={18} />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
