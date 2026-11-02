import type { Metadata } from 'next';

import { Container } from '@/components/layout/Container';
import { PricingPlans } from '@/components/marketing/PricingPlans';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  addons,
  formatEuro,
  founderProgramMailtoSubject,
  founderProgramText,
  pricingCopy,
} from '@/content/pricing';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: pricingCopy.title,
  description: pricingCopy.metaDescription,
  alternates: { canonical: '/preise' },
};

export default function PreisePage() {
  const founderMailto = `mailto:${site.supportEmail}?subject=${encodeURIComponent(founderProgramMailtoSubject)}`;

  return (
    <div className="py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {pricingCopy.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            {pricingCopy.description}
          </p>
        </div>

        <section className="mx-auto mt-14 max-w-3xl" aria-labelledby="gruenderprogramm">
          <Card>
            <CardHeader>
              <h2 id="gruenderprogramm" className="text-xl font-semibold">
                {pricingCopy.founderTitle}
              </h2>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-6">
              <p className="text-muted-foreground">{founderProgramText}</p>
              <a href={founderMailto} className={buttonVariants({ variant: 'outline' })}>
                {pricingCopy.founderCta}
              </a>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16" aria-labelledby="pakete">
          <h2 id="pakete" className="text-center text-3xl font-semibold tracking-tight">
            {pricingCopy.plansTitle}
          </h2>
          <PricingPlans />
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground text-pretty">
            {pricingCopy.licenseNote}
          </p>
        </section>

        <section className="mt-16" aria-labelledby="zusatzleistungen">
          <h2 id="zusatzleistungen" className="text-center text-3xl font-semibold tracking-tight">
            {pricingCopy.addonsTitle}
          </h2>
          <ul className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
            {addons.map((addon) => (
              <li
                key={addon.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border bg-card px-6 py-4"
              >
                <span className="font-medium">{addon.name}</span>
                <span>
                  {formatEuro(addon.amountEuro)} {addon.cadence}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground text-pretty">
          {pricingCopy.priceNote}
        </p>
      </Container>
    </div>
  );
}
