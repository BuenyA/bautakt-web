import { Card, CardContent, CardHeader, CardTitle } from '@bautakt/ui';

import { Container } from '@/components/layout/Container';
import { features } from '@/content/features';

import { SectionHeading } from './SectionHeading';

export function FeatureGrid() {
  return (
    <section id="funktionen" className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Funktionen"
          title="Alles, was ein Betrieb täglich braucht"
          description="Von der Auftragsannahme bis zur bezahlten Rechnung — ohne Zettel und ohne zweites System."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.slug}>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">{feature.summary}</p>
                <ul className="flex flex-col gap-1.5">
                  {feature.details.map((detail) => (
                    <li key={detail} className="text-sm text-text-secondary">
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
