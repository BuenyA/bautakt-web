import { Card, CardContent, CardHeader, CardTitle } from '@bautakt/ui';
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
    <Card className={className}>
      {title ? (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent>
        <dl className="flex flex-col gap-4">{children}</dl>
      </CardContent>
    </Card>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-foreground text-sm whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
