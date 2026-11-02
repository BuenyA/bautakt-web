'use client';

import Link from 'next/link';
import { useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  type BillingPeriod,
  businessPlan,
  defaultBillingPeriod,
  formatEuro,
  pricingCopy,
  standardPlans,
  standardPriceView,
  usersLabel,
} from '@/content/pricing';
import { cn } from '@/lib/cn';

const periods = [
  { value: 'monthly', label: pricingCopy.monthlyLabel },
  { value: 'yearly', label: pricingCopy.yearlyLabel },
] as const satisfies readonly { value: BillingPeriod; label: string }[];

/**
 * Umschalter und die vier Pakete, die er betrifft.
 *
 * Der Anfangswert ist `yearly` und steht schon im serverseitigen HTML.
 * Kein Effekt setzt ihn nach, sonst flackert die Seite von monatlich
 * auf jährlich. Business hat keinen Jahrespreis und bleibt stehen.
 */
export function PricingPlans() {
  const [period, setPeriod] = useState<BillingPeriod>(defaultBillingPeriod);

  return (
    <div className="mt-8">
      <fieldset className="mx-auto w-fit border-0 p-0">
        <legend className="sr-only">{pricingCopy.billingLegend}</legend>
        <div className="inline-flex rounded-full border bg-card p-1">
          {periods.map((option) => {
            const checked = period === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                  checked ? 'bg-foreground text-background' : 'text-foreground',
                )}
              >
                <input
                  type="radio"
                  name="abrechnungszeitraum"
                  value={option.value}
                  checked={checked}
                  onChange={() => setPeriod(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {standardPlans.map((plan) => {
          const view = standardPriceView(plan, period);
          return (
            <Card
              key={plan.id}
              className={cn('h-full', plan.badge && 'border-2 border-foreground shadow-md')}
            >
              <CardHeader>
                {plan.badge ? (
                  <span className="inline-flex w-fit items-center rounded-full border border-foreground px-2.5 py-0.5 text-xs font-semibold">
                    {plan.badge}
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm text-text-secondary">{usersLabel(plan.users)}</p>
                <div aria-live="polite">
                  <p className="sr-only">{plan.name}</p>
                  <p className="text-3xl font-semibold tracking-tight">
                    {formatEuro(view.amountEuro)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{view.detail}</p>
                  {view.savings ? (
                    <p className="mt-1 text-sm font-medium">{view.savings}</p>
                  ) : (
                    <p className="mt-1 min-h-5" aria-hidden="true" />
                  )}
                </div>
                <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link
                  href="/kontakt"
                  className={cn(buttonVariants({ variant: 'outline' }), 'mt-auto w-full')}
                >
                  {pricingCopy.contactCta}
                </Link>
              </CardContent>
            </Card>
          );
        })}

        <Card className="h-full">
          <CardHeader>
            <h3 className="text-lg font-semibold">{businessPlan.name}</h3>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {businessPlan.tiers.map((tier) => (
                <li key={tier.users} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{usersLabel(tier.users)}</span>
                  <span className="font-semibold">
                    {formatEuro(tier.monthlyEuro)} {pricingCopy.perMonth}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
              {businessPlan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link
              href="/kontakt"
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-auto w-full')}
            >
              {pricingCopy.contactCta}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
