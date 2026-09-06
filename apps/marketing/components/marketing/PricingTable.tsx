import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@bautakt/ui';

import { Container } from '@/components/layout/Container';
import { formatPlanPrice, plans, pricingCopy } from '@/content/pricing';
import { REGISTER_URL } from '@/lib/site';

import { SectionHeading } from './SectionHeading';

/**
 * Alle Pläne.
 * Profi (featured): Primary #3B86E0, CTA „Kostenlos testen“.
 * Basis/Betrieb: weiß, Rahmen anthrazit/grau, CTA „Loslegen“.
 */
export function PricingTable() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow={pricingCopy.eyebrow}
          title={pricingCopy.title}
          description={pricingCopy.description}
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.slug}
              className={cn(
                plan.featured
                  ? 'border-primary shadow-md'
                  : 'border-[#1C1F26]/25 bg-background shadow-none',
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.featured ? (
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                      Empfohlen
                    </span>
                  ) : null}
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
                <Button
                  asChild
                  variant={plan.featured ? 'default' : 'outline'}
                  className={cn(!plan.featured && 'border-[#1C1F26]/35 text-[#1C1F26]')}
                >
                  <a href={REGISTER_URL}>
                    {plan.featured ? pricingCopy.featuredCtaLabel : pricingCopy.ctaLabel}
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
