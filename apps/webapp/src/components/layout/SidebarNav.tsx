import { NavItem, Tooltip } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';

import type { NavItem as NavItemConfig } from './navItems';

/**
 * Ein Eintrag der Seitenleiste als Fluent-`NavItem`, der clientseitig
 * navigiert.
 *
 * Eingeklappt (Icon-Leiste) bleibt der Text für Screenreader im Eintrag und
 * erscheint sichtbar als Tooltip. Der aktive Eintrag bekommt Fluents neutrale
 * Fläche und den Brand-Indikator; das steuert `selectedValue` am `NavDrawer`.
 */
export function SidebarNavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItemConfig;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const link = useRouterLink(item.to);
  const Icon = item.icon;
  const label = t(item.labelKey);

  const entry = (
    <NavItem
      value={item.to}
      href={link.href}
      icon={<Icon />}
      onClick={(event) => {
        link.onClick(event);
        onNavigate?.();
      }}
    >
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </NavItem>
  );

  if (!collapsed) return entry;

  return (
    <Tooltip content={label} relationship="description" positioning="after">
      {entry}
    </Tooltip>
  );
}
