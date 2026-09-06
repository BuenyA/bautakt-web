import type { Metadata } from 'next';

import { Container } from '@/components/layout/Container';
import { SectionHeading } from '@/components/marketing/SectionHeading';

export const metadata: Metadata = {
  title: 'Über uns',
  description:
    'Bautakt entsteht mit Handwerks- und Baubetrieben. Weniger Zettel, mehr Takt im Betrieb.',
  alternates: { canonical: '/ueber-uns' },
};

export default function UeberUnsPage() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading title="Über uns" />
        <div className="mx-auto mt-12 flex max-w-2xl flex-col gap-4 text-muted-foreground">
          <p>
            Bautakt entsteht aus der Zusammenarbeit mit Handwerks- und Baubetrieben, die ihre
            Aufträge, Zeiten und Rechnungen bislang über Zettel, Tabellen und mehrere Programme
            verteilt haben.
          </p>
          <p>
            Ziel ist eine Software, die auf der Baustelle genauso funktioniert wie im Büro. Auch
            dann, wenn gerade kein Netz da ist.
          </p>
          <p>Weniger Zettel. Weniger Doppelarbeit. Mehr Takt im Betrieb.</p>
        </div>
      </Container>
    </section>
  );
}
