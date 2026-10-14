import { Card, CardHeader, Text } from '@fluentui/react-components';
import type { ReactNode } from 'react';

/**
 * Karte mit Überschrift und Aktionen rechts (Hinzufügen, Archivieren …).
 * `DetailCard` kennt keine Aktionen; die Kontakt-Detailseite braucht sie je
 * Abschnitt.
 */
export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card size="large">
      <CardHeader
        header={
          <Text as="h2" size={400} weight="semibold">
            {title}
          </Text>
        }
        description={description ? <div>{description}</div> : undefined}
        action={action ? <div className="flex items-center gap-1">{action}</div> : undefined}
      />
      {children}
    </Card>
  );
}
