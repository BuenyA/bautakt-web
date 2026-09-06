import { Button } from '@bautakt/ui';
import Link from 'next/link';

import { Container } from '@/components/layout/Container';
import { REGISTER_URL, site } from '@/lib/site';

import { HeroDevice } from './HeroDevice';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,134,224,0.08),_transparent_55%)]"
      />
      <Container className="relative flex flex-col items-center text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-text-subtle">
          FÜR HANDWERKSBETRIEBE
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl animate-[hero-rise_0.55s_ease-out_0.05s_both]">
          {site.tagline}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty animate-[hero-rise_0.55s_ease-out_0.1s_both]">
          {site.description}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-[hero-rise_0.55s_ease-out_0.15s_both]">
          <Button asChild size="lg">
            <a href={REGISTER_URL}>Kostenlos testen</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/#funktionen">Funktionen ansehen</Link>
          </Button>
        </div>
        <HeroDevice />
      </Container>
    </section>
  );
}
