import { Card, type CardProps } from '@fluentui/react-components';
import type * as React from 'react';

/**
 * Fluent-`Card`, die eine Aktion auslöst (Notiz, Zeit, Foto öffnen).
 *
 * Fluents `Card` rendert nur als `div`; mit `onClick` bekommt sie Hover und
 * Fokusrahmen, aber keine Tastaturbedienung. Hier kommt dazu, was ein Knopf
 * kann: `role="button"`, Tab-Fokus, Enter und Leertaste. Nur auf der Karte
 * selbst, nicht auf Links oder Knöpfen darin.
 */
export function ActionCard({
  onAction,
  children,
  ...props
}: Omit<CardProps, 'onClick' | 'role' | 'tabIndex'> & {
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card
      {...props}
      role="button"
      tabIndex={0}
      onClick={onAction}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onAction();
        }
      }}
    >
      {children}
    </Card>
  );
}
