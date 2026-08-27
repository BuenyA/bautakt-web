import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bautakt/ui';
import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background-second p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="text-center text-lg font-semibold tracking-tight">Bautakt</p>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
        {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </main>
  );
}
