import { cn } from '@bautakt/ui';

/**
 * Nur das Zeichen: der orangene Bauhelm aus `/public/bautakt-logo.png`.
 * Quelle ist `bautakt_logo.png` im Projektordner, dasselbe Bild wie in der
 * Handy-App und auf der Marketing-Seite. Nicht einfärben oder invertieren.
 */
export function BautaktSignet({ className }: { className?: string }) {
  return (
    <img
      src="/bautakt-logo.png"
      alt="Bautakt"
      width={480}
      height={351}
      className={cn('size-8 object-contain', className)}
    />
  );
}
