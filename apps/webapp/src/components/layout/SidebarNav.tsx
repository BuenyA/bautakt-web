import { mergeClasses, NavItem, Tooltip } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';

import type { NavItem as NavItemConfig } from './navItems';
import { useSidebarStyles } from './sidebarStyles';

/**
 * Ein Eintrag der Seitenleiste als Fluent-`NavItem`, der clientseitig
 * navigiert.
 *
 * Eingeklappt (Icon-Leiste) bleibt der Text im Eintrag, nur ausgeblendet —
 * Screenreader lesen ihn weiter, sichtbar erscheint er als Tooltip.
 * Icon und Text stehen in beiden Zuständen gleich (`sidebarStyles`). Der aktive Eintrag bekommt Fluents neutrale
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
  const sidebar = useSidebarStyles();
  const link = useRouterLink(item.to);
  const Icon = item.icon;
  const label = t(item.labelKey);

  const entry = (
    <NavItem
      value={item.to}
      href={link.href}
      icon={<Icon />}
      className={sidebar.item}
      onClick={(event) => {
        link.onClick(event);
        onNavigate?.();
      }}
    >
      <span className={mergeClasses(sidebar.label, collapsed && sidebar.labelHidden)}>{label}</span>
    </NavItem>
  );

  if (!collapsed) return entry;

  return (
    <Tooltip content={label} relationship="description" positioning="after">
      {entry}
    </Tooltip>
  );
}
