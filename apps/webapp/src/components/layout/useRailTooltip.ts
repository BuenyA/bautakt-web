import { useState } from 'react';

/**
 * Tooltip-Props für die Leiste: Der Tooltip erscheint nur eingeklappt
 * (ausgeklappt steht der Text ja da).
 *
 * Der Tooltip umschließt den Eintrag in beiden Zuständen: Käme er nur
 * eingeklappt dazu, würde der Eintrag beim Umschalten neu aufgebaut — der aktive
 * Eintrag verlöre dabei kurz seine Markierung. Ein Hook statt einer
 * Hüllkomponente, weil `MenuTrigger` nur durch Fluents eigenen `Tooltip`
 * hindurchreicht.
 */
export function useRailTooltip(collapsed: boolean) {
  const [visible, setVisible] = useState(false);
  return {
    relationship: collapsed ? 'description' : 'inaccessible',
    positioning: 'after',
    visible: collapsed && visible,
    onVisibleChange: (_: unknown, data: { visible: boolean }) => setVisible(data.visible),
  } as const;
}
