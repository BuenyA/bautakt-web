import { Card, CardContent, CardHeader, CardTitle } from '@bautakt/ui';
import Link from 'next/link';

import { Container } from '@/components/layout/Container';
import { features, featuresCopy } from '@/content/features';

import { SectionHeading } from './SectionHeading';

type FeatureGridProps = {
  /** `section` = Startseite (H2 + Link). `page` = /funktionen (H1, ohne Link). */
  variant?: 'section' | 'page';
};

export function FeatureGrid({ variant = 'section' }: FeatureGridProps) {
  const isPage = variant === 'page';

  return (
    <section id="funktionen" className="py-20">
      <Container>
        {isPage ? (
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {featuresCopy.page.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              {featuresCopy.page.description}
            </p>
          </div>
        ) : (
          <SectionHeading
            eyebrow={featuresCopy.section.eyebrow}
            title={featuresCopy.section.title}
            description={featuresCopy.section.description}
          />
        )}
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
        {!isPage ? (
          <p className="mt-10 text-center">
            <Link
              href="/funktionen"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {featuresCopy.allLinkLabel}
            </Link>
          </p>
        ) : null}
      </Container>
    </section>
  );
}
