import {
  Button,
  DialogTrigger,
  DrawerFooter,
  DrawerHeaderTitle,
  OverlayDrawer,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import type * as React from 'react';

import { cn } from '../lib/cn';

/**
 * Seitenpanel für die kurzen Formulare (Kunde, Zeiteintrag, Abwesenheit …).
 *
 * Fluents `OverlayDrawer` von rechts. Die Liste dahinter bleibt sichtbar,
 * damit klar ist, wozu der Eintrag gehört. Lange Belege mit Positionen
 * bekommen eine eigene Route; im Panel wäre die Positionsliste nicht zu
 * bedienen.
 *
 * Aufbau: `FormDrawer` > (Formular) > `DrawerHeader` mit `FormDrawerTitle`
 * und `FormDrawerDescription`, `DrawerBody`, `FormDrawerFooter`. Das Formular
 * liegt zwischen Drawer und Kopf, damit Enter im Feld absendet; es braucht
 * `className="flex h-full min-h-0 flex-col"`, sonst scrollt der Body nicht.
 *
 * `onOpenChange` bekommt nur den Wert, wie zuvor bei shadcn. Wer das Schließen
 * während einer laufenden Mutation sperren will, nimmt `useDismissLock`.
 */
export function FormDrawer({
  open,
  onOpenChange,
  size = 'medium',
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}) {
  return (
    <OverlayDrawer
      position="end"
      size={size}
      open={open}
      onOpenChange={(_, data) => onOpenChange(data.open)}
    >
      {children}
    </OverlayDrawer>
  );
}

/**
 * Titel mit Schließen-Knopf. `DialogTrigger action="close"` geht an den
 * Dialog, auf dem `OverlayDrawer` aufbaut, und landet in dessen `onOpenChange`.
 */
export function FormDrawerTitle({
  children,
  closeLabel = 'Schließen',
}: {
  children: React.ReactNode;
  closeLabel?: string;
}) {
  return (
    <DrawerHeaderTitle
      action={
        <DialogTrigger action="close" disableButtonEnhancement>
          <Button appearance="subtle" aria-label={closeLabel} icon={<DismissRegular />} />
        </DialogTrigger>
      }
    >
      {children}
    </DrawerHeaderTitle>
  );
}

export function FormDrawerDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

export function FormDrawerFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DrawerFooter>
      <div className={cn('flex w-full flex-wrap items-center justify-end gap-2', className)}>
        {children}
      </div>
    </DrawerFooter>
  );
}
