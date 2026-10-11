import { Card, CardHeader, Text } from '@fluentui/react-components';
import type { ReactNode } from 'react';

/**
 * Stammdaten als Beschreibungsliste in einer Karte.
 *
 * Leere Felder fallen raus statt einen Gedankenstrich zu zeigen: eine Zeile
 * „Kostenstelle —" sagt nichts, kostet aber Platz und Aufmerksamkeit.
 */
export function DetailCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card size="large" className={className}>
      {title ? (
        <CardHeader
          header={
            <Text as="h2" size={400} weight="semibold">
              {title}
            </Text>
          }
        />
      ) : null}
      <dl className="flex flex-col gap-4">{children}</dl>
    </Card>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
