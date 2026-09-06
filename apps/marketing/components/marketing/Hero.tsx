import { Button } from '@bautakt/ui';
import Link from 'next/link';

import { Container } from '@/components/layout/Container';
import { REGISTER_URL, site } from '@/lib/site';

import { HeroDevice } from './HeroDevice';

/** H1 laut Spec; „Rechnungen“ als Accent-Highlight (#3B86E0 via text-primary). */
function HeroHeadline() {
  return (
    <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance text-[#1C1F26] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
      Aufträge, Zeiten und <span className="text-primary">Rechnungen</span> im Takt.
    </h1>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#F7F8FA] py-14 sm:py-20">
      <Container className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start text-left animate-[hero-rise_0.55s_ease-out_both]">
          <p className="inline-flex rounded-full bg-background px-3 py-1 text-[0.7rem] font-semibold tracking-[0.14em] text-text-secondary">
            FÜR HANDWERKSBETRIEBE
          </p>
          <div className="mt-5">
            <HeroHeadline />
          </div>
          <p className="mt-5 max-w-md text-base text-muted-foreground text-pretty sm:text-lg">
            {site.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <a href={REGISTER_URL}>Kostenlos testen</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link href="/#funktionen">Funktionen ansehen</Link>
            </Button>
          </div>
        </div>
        <div className="animate-[hero-rise_0.7s_ease-out_0.1s_both]">
          <HeroDevice />
        </div>
      </Container>
    </section>
  );
}
