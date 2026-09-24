import type * as React from 'react';
import { toast, Toaster as SonnerToaster } from 'sonner';

/**
 * Rueckmeldungen nach dem Speichern. Farben kommen aus den Tokens, damit ein
 * Fehler-Toast dasselbe Rot traegt wie der Rest der Oberflaeche.
 */
function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'group rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-surface text-muted-foreground',
          error: 'border-destructive/30 bg-destructive-bg text-destructive',
          success: 'border-success/30 bg-success-bg text-success',
        },
      }}
      {...props}
    />
  );
}

export { toast, Toaster };
