import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@bautakt/ui';

import { Container } from '@/components/layout/Container';
import { plans } from '@/content/pricing';
import { REGISTER_URL } from '@/lib/site';

import { SectionHeading } from './SectionHeading';

export function PricingTable() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Preise"
          title="Pro Nutzer, monatlich kündbar"
          description="Sie zahlen nur für Mitarbeiter, die Bautakt tatsächlich nutzen."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.slug} className={cn(plan.featured && 'border-primary shadow-md')}>
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
                <div>
                  <p className="text-3xl font-semibold">{plan.price}</p>
                  <p className="text-sm text-muted-foreground">{plan.interval}</p>
                </div>
                <ul className="flex flex-col gap-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-sm text-text-secondary">
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={plan.featured ? 'default' : 'outline'}>
                  <a href={REGISTER_URL}>Loslegen</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
