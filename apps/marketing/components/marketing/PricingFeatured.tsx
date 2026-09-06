import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bautakt/ui';
import Link from 'next/link';

import { Container } from '@/components/layout/Container';
import { formatPlanPrice, getFeaturedPlan, pricingCopy } from '@/content/pricing';
import { REGISTER_URL } from '@/lib/site';

import { SectionHeading } from './SectionHeading';

/** Nur der empfohlene Plan auf der Startseite, mit Link auf /preise. */
export function PricingFeatured() {
  const plan = getFeaturedPlan();

  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow={pricingCopy.eyebrow}
          title={pricingCopy.title}
          description={pricingCopy.description}
        />
        <div className="mx-auto mt-14 max-w-md">
          <Card className="border-primary shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  Empfohlen
                </span>
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <p className="text-xl font-semibold tracking-tight">{formatPlanPrice(plan)}</p>
              <ul className="flex flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm text-text-secondary">
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild>
                <a href={REGISTER_URL}>{pricingCopy.featuredCtaLabel}</a>
              </Button>
            </CardContent>
          </Card>
          <p className="mt-6 text-center">
            <Link
              href="/preise"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {pricingCopy.allLinkLabel}
            </Link>
          </p>
        </div>
      </Container>
    </section>
  );
}
