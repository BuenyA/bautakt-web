import {
  Combobox as FluentCombobox,
  type ComboboxProps,
  type PositioningProps,
} from '@fluentui/react-components';
import type { Ref } from 'react';

/**
 * Liste immer unter dem Feld. Fluent weicht sonst nach oben, rechts oder links
 * aus, sobald sie nicht ganz passt; `pinned` schaltet das ab, `autoSize` kürzt
 * die Liste stattdessen auf den Platz darunter, und sie scrollt.
 *
 * `fixed`: Mit `absolute` steht die Liste im ersten Frame noch in voller Länge
 * am Ende von `body`, bevor `autoSize` sie kürzt. Die Seite wird kurz länger,
 * rechts blitzt eine Scrollbar auf und schiebt alles nach links.
 */
const BELOW: PositioningProps = {
  strategy: 'fixed',
  position: 'below',
  align: 'start',
  pinned: true,
  autoSize: 'height',
};

/** Fluent-Combobox mit Liste unter dem Feld. Im Webapp immer diese nehmen. */
export function Combobox({
  positioning,
  ref,
  ...props
}: ComboboxProps & { ref?: Ref<HTMLInputElement> }) {
  return (
    <FluentCombobox
      {...props}
      ref={ref}
      positioning={
        positioning && typeof positioning === 'object' && !('current' in positioning)
          ? { ...BELOW, ...positioning }
          : (positioning ?? BELOW)
      }
    />
  );
}
