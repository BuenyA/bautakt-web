import { cn } from '@bautakt/ui';

/**
 * Lockup: Bauhelm und Schriftzug „Bautakt“. Der Schriftzug ist Text, damit er
 * `--foreground` übernimmt und im Dunkelmodus hell wird; der Helm bleibt orange.
 * Die Helmhöhe hängt per `em` an der Schriftgröße, damit Bild und Schriftzug
 * gleich groß wirken.
 */
export function BautaktLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-foreground inline-flex items-center gap-2 text-xl font-semibold tracking-tight',
        className,
      )}
    >
      <img src="/bautakt-logo.png" alt="" width={480} height={351} className="h-[1em] w-auto" />
      <span>Bautakt</span>
    </span>
  );
}
