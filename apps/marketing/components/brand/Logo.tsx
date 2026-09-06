import { cn } from '@bautakt/ui';
import Link from 'next/link';

import { site } from '@/lib/site';

type LogoProps = {
  className?: string;
  /** Wenn false, nur das Markenzeichen ohne Link (z. B. im Footer-Block). */
  linked?: boolean;
};

/**
 * Kanonisches Lockup v4.4 aus `/public/bautakt-logo.svg`.
 * Anthrazit #1C1F26. Blau bleibt den CTAs vorbehalten.
 */
export function Logo({ className, linked = true }: LogoProps) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element -- kanonisches SVG-Lockup, kein Raster
    <img
      src="/bautakt-logo.svg"
      alt={site.name}
      width={220}
      height={40}
      className={cn('h-8 w-auto', className)}
    />
  );

  if (!linked) return mark;

  return (
    <Link href="/" className="inline-flex items-center" aria-label={`${site.name} Startseite`}>
      {mark}
    </Link>
  );
}
