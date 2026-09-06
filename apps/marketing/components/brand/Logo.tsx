import { cn } from '@bautakt/ui';
import Link from 'next/link';

import { site } from '@/lib/site';

/** Anthrazit für Logo-Taktbalken und Wordmark. Blau bleibt den CTAs vorbehalten. */
const LOGO_INK = '#1C1F26';

type LogoProps = {
  className?: string;
  /** Wenn false, nur das Markenzeichen ohne Link (z. B. im Footer-Block). */
  linked?: boolean;
};

/**
 * Drei vertikale Taktbalken + Wordmark. Kein Hamburger-Signet.
 * Farbe bewusst Anthrazit, nicht Primary-Blau.
 */
export function Logo({ className, linked = true }: LogoProps) {
  const mark = (
    <span className={cn('inline-flex items-center gap-2', className)} style={{ color: LOGO_INK }}>
      <svg aria-hidden viewBox="0 0 20 24" className="h-6 w-5 shrink-0" fill="currentColor">
        <rect x="0" y="8" width="4" height="16" rx="1" />
        <rect x="8" y="4" width="4" height="20" rx="1" />
        <rect x="16" y="0" width="4" height="24" rx="1" />
      </svg>
      <span className="text-lg font-semibold tracking-tight">{site.name}</span>
    </span>
  );

  if (!linked) return mark;

  return (
    <Link href="/" className="inline-flex" aria-label={`${site.name} Startseite`}>
      {mark}
    </Link>
  );
}
