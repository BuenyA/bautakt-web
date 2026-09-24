'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '../../lib/cn';

/**
 * Die Farbvarianten bilden die Statusfarben der Mobile-App ab: `success` und
 * `destructive` nutzen die geprueften Kontrastpaare aus `theme.css`, nicht
 * beliebige Tailwind-Farben.
 */
const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>span[data-slot=uicon]]:text-[0.875em] transition-colors overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        accent: 'border-transparent bg-accent text-accent-foreground',
        outline: 'border-border-strong text-foreground',
        success: 'border-transparent bg-success-bg text-success',
        destructive: 'border-transparent bg-destructive-bg text-destructive',
        warning: 'border-warning-border bg-warning-bg text-warning',
        muted: 'border-transparent bg-surface text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
