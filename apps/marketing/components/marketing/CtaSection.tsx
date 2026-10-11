import Link from 'next/link';

import { Container } from '@/components/layout/Container';
import { buttonVariants } from '@/components/ui/button';
import { LOGIN_URL } from '@/lib/site';

export function CtaSection() {
  return (
    <section className="py-20">
      <Container>
        {/* Fläche bleibt das helle Accent. Textfarbe deshalb fest, nicht
            foreground: im Dunkelmodus wäre der sonst weiß auf Hellblau. */}
        <div className="rounded-2xl bg-accent px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance text-[#1C1F26]">
            Für die Baustelle und das Büro
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-[#374151]">
            Aufträge, Zeiten und Rechnungen an einer Stelle. Auch ohne Empfang.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={LOGIN_URL}
              className={buttonVariants({ size: 'lg', className: 'rounded-full px-7' })}
            >
              Anmelden
            </a>
            <Link
              href="#funktionen"
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'rounded-full px-7',
              })}
            >
              Mehr erfahren
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
