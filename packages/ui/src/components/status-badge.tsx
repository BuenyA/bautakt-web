import { Badge, type BadgeProps } from '@fluentui/react-components';
import type * as React from 'react';

/**
 * Statusmarke (Auftragsstatus, „abgerechnet“, „überzahlt“ …) auf Fluents
 * `Badge`. Die Töne sind die Fluent-Farben, nicht eigene: `neutral` ist das
 * graue `informative`, die übrigen heißen wie bei Fluent.
 */
export type StatusTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'outline';

const TONES: Record<StatusTone, Pick<BadgeProps, 'appearance' | 'color'>> = {
  neutral: { appearance: 'tint', color: 'informative' },
  brand: { appearance: 'tint', color: 'brand' },
  success: { appearance: 'tint', color: 'success' },
  warning: { appearance: 'tint', color: 'warning' },
  danger: { appearance: 'tint', color: 'danger' },
  outline: { appearance: 'outline', color: 'informative' },
};

export function StatusBadge({
  tone,
  icon,
  children,
}: {
  tone: StatusTone;
  icon?: React.ReactElement;
  children: React.ReactNode;
}) {
  return (
    <Badge {...TONES[tone]} icon={icon} shape="rounded">
      {children}
    </Badge>
  );
}
