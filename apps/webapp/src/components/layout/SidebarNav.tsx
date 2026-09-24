import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Uicon,
} from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';

import { useMembership } from '@/features/company/useMembership';

import { maySee, navGroups } from './navItems';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const { pathname } = useLocation();

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => maySee(item, membership?.permissions)),
    }))
    // Eine Gruppe ohne sichtbare Eintraege verschwindet samt Ueberschrift —
    // eine leere Ueberschrift „Finanzen" waere ein Hinweis auf etwas, das der
    // Angemeldete nicht aufrufen kann.
    .filter((group) => group.items.length > 0);

  return (
    <>
      {visibleGroups.map((group, index) => (
        <SidebarGroup key={group.labelKey ?? `group-${index}`}>
          {group.labelKey ? <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    tooltip={t(item.labelKey)}
                    isActive={isActive(pathname, item.to)}
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
      ))}
    </>
  );
}

/** Auch die Detailseite haelt ihren Bereich in der Leiste markiert. */
function isActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}
