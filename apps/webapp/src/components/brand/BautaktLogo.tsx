import { cn } from '@bautakt/ui';

/**
 * Lockup: Bauhelm und Schriftzug „Bautakt“. Der Schriftzug ist Text, damit er
 * `--foreground` übernimmt und im Dunkelmodus hell wird; der Helm bleibt orange.
 */
export function BautaktLogo({ className }: { className?: string }) {
  return (
    <span className={cn('text-foreground inline-flex items-center gap-2', className)}>
      <img src="/bautakt-logo.png" alt="" width={480} height={351} className="h-8 w-auto" />
      <span className="text-xl font-semibold tracking-tight">Bautakt</span>
    </span>
  );
}
