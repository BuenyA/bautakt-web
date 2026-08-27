import type { Metadata } from 'next';

import { Container } from '@/components/layout/Container';
import { SectionHeading } from '@/components/marketing/SectionHeading';

export const metadata: Metadata = {
  title: 'Über uns',
  description: 'Wer hinter Bautakt steht und warum es die Software gibt.',
  alternates: { canonical: '/ueber-uns' },
};

export default function UeberUnsPage() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading title="Über uns" />
        <div className="mx-auto mt-12 flex max-w-2xl flex-col gap-4 text-muted-foreground">
          {/* TODO: Von der Geschäftsführung schreiben lassen. Platzhalter. */}
          <p>
            Bautakt entsteht aus der Zusammenarbeit mit Handwerks- und Baubetrieben, die ihre
            Aufträge, Zeiten und Rechnungen bislang über Zettel, Tabellen und mehrere Programme
            verteilt haben.
          </p>
          <p>
            Ziel ist eine Software, die auf der Baustelle genauso funktioniert wie im Büro — auch
            dann, wenn gerade kein Netz da ist.
          </p>
        </div>
      </Container>
    </section>
  );
}
