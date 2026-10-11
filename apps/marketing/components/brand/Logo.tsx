import Link from 'next/link';

import { cn } from '@/lib/cn';
import { site } from '@/lib/site';

type LogoProps = {
  className?: string;
  /** Wenn false, nur das Markenzeichen ohne Link (z. B. im Footer-Block). */
  linked?: boolean;
};

/**
 * Lockup: der orangene Bauhelm aus `/public/bautakt-logo.png` und der
 * Schriftzug „Bautakt“. Quelle ist `bautakt_logo.png` im Projektordner,
 * dasselbe Bild wie in Web-App und Handy-App.
 * Der Schriftzug ist Text in Anthrazit #1C1F26, im Dunkelmodus hell. Das Bild
 * wird nie invertiert — sonst würde der Helm blau.
 */
export function Logo({ className, linked = true }: LogoProps) {
  const mark = (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[#1C1F26] dark:text-foreground',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- kleines Logo, kein next/image nötig */}
      <img src="/bautakt-logo.png" alt="" width={480} height={293} className="h-8 w-auto" />
      <span className="text-xl font-semibold tracking-tight">{site.name}</span>
    </span>
  );

  if (!linked) return mark;

  return (
    <Link href="/" className="inline-flex items-center" aria-label={`${site.name} Startseite`}>
      {mark}
    </Link>
  );
}
