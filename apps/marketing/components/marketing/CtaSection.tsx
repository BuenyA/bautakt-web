import { Button } from '@bautakt/ui';

import { Container } from '@/components/layout/Container';
import { REGISTER_URL } from '@/lib/site';

export function CtaSection() {
  return (
    <section className="py-20">
      <Container>
        <div className="rounded-2xl bg-accent px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Richten Sie Ihren Betrieb in wenigen Minuten ein
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-pretty">
            Konto anlegen, Mitarbeiter einladen, ersten Auftrag erfassen.
          </p>
          <Button asChild size="lg" className="mt-8">
            <a href={REGISTER_URL}>Kostenlos testen</a>
          </Button>
        </div>
      </Container>
    </section>
  );
}
