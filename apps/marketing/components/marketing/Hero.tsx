import { Button } from '@bautakt/ui';

import { Container } from '@/components/layout/Container';
import { LOGIN_URL, REGISTER_URL, site } from '@/lib/site';

export function Hero() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="flex flex-col items-center text-center">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          {site.tagline}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
          {site.description}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href={REGISTER_URL}>Kostenlos testen</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={LOGIN_URL}>Anmelden</a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-text-subtle">Keine Kreditkarte nötig.</p>
      </Container>
    </section>
  );
}
