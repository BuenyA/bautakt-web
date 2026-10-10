import Link from 'next/link';

import { cn } from '@/lib/cn';
import { site } from '@/lib/site';

type LogoProps = {
  className?: string;
  /** Wenn false, nur das Markenzeichen ohne Link (z. B. im Footer-Block). */
  linked?: boolean;
};

/**
 * Kanonisches Lockup v4.4 aus `/public/bautakt-logo.svg`.
 * Anthrazit #1C1F26. Blau bleibt den CTAs vorbehalten.
 * Im Dunkelmodus wird das Lockup invertiert, sonst verschwindet Anthrazit
 * auf der dunklen Fläche.
 */
export function Logo({ className, linked = true }: LogoProps) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element -- kanonisches SVG-Lockup, kein Raster
    <img
      src="/bautakt-logo.svg"
      alt={site.name}
      width={220}
      height={40}
      className={cn('h-8 w-auto dark:brightness-0 dark:invert', className)}
    />
  );

  if (!linked) return mark;

  return (
    <Link href="/" className="inline-flex items-center" aria-label={`${site.name} Startseite`}>
      {mark}
    </Link>
  );
}
