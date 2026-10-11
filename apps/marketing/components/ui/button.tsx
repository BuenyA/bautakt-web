import type * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Knopf der Marketing-Seite.
 *
 * Bis 2026-10 kam er als shadcn-`Button` aus packages/ui. Seit die Web-App auf
 * Fluent UI umgestellt ist, lebt er hier, ohne Radix und ohne cva. Die Klassen
 * sind unverändert. Für Links gibt es kein `asChild`: `buttonVariants()` liefert
 * die Klassen, die ein `<a>` oder `<Link>` direkt trägt.
 */
const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer";

const variants = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
} as const;

const sizes = {
  // 44px Mindesthoehe fuer Touch-Ziele wie in der Mobile-App (h-11).
  default: 'h-11 px-4 py-2 has-[>svg]:px-3',
  lg: 'h-12 rounded-full px-6 has-[>svg]:px-4',
} as const;

type ButtonVariantProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

export function buttonVariants({
  variant = 'default',
  size = 'default',
  className,
}: ButtonVariantProps = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'button'> & ButtonVariantProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
