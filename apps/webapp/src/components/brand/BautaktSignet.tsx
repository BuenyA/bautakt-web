import { cn } from '@bautakt/ui';

/** Nur das Signet (drei Takt-Balken). Farbe folgt `currentColor`. */
export function BautaktSignet({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      role="img"
      aria-label="Bautakt"
      className={cn('size-8 text-foreground', className)}
    >
      <title>Bautakt Signet</title>
      <g fill="currentColor">
        <rect x="3" y="16" width="6" height="12" rx="3" />
        <rect x="13" y="8" width="6" height="20" rx="3" />
        <rect x="23" y="2" width="6" height="26" rx="3" />
      </g>
    </svg>
  );
}
