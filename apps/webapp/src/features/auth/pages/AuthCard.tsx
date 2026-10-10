import { Card, CardHeader, Text } from '@fluentui/react-components';
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
    <main className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="text-foreground text-center text-lg font-semibold tracking-tight">Bautakt</p>
        <Card size="large">
          <CardHeader
            header={
              <Text as="h1" size={500} weight="semibold">
                {title}
              </Text>
            }
            description={subtitle}
          />
          <div className="flex flex-col gap-4">{children}</div>
        </Card>
        {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </main>
  );
}
