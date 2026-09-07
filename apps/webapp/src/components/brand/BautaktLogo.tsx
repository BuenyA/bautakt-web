import { cn } from '@bautakt/ui';

/**
 * Kanonisches Lockup (Signet + Wordmark). Farbe folgt `currentColor`, damit
 * das Logo `--foreground` uebernimmt statt ein festes Anthrazit zu hardcoden.
 */
export function BautaktLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 40"
      role="img"
      aria-label="Bautakt"
      className={cn('h-8 w-auto text-foreground', className)}
    >
      <title>Bautakt</title>
      <g fill="currentColor">
        <rect x="0" y="18" width="6" height="14" rx="3" />
        <rect x="10" y="10" width="6" height="22" rx="3" />
        <rect x="20" y="4" width="6" height="28" rx="3" />
      </g>
      <text
        x="36"
        y="28"
        fontFamily="Inter, Geist, system-ui, -apple-system, sans-serif"
        fontSize="22"
        fontWeight="600"
        fill="currentColor"
        letterSpacing="-0.02em"
      >
        Bautakt
      </text>
    </svg>
  );
}
