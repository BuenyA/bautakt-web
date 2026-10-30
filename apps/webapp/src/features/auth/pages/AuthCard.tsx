import { darkTheme } from '@bautakt/ui';
import { Card, CardHeader, FluentProvider, Text } from '@fluentui/react-components';
import type { ReactNode } from 'react';

import { BautaktLogo } from '@/components/brand/BautaktLogo';
import { LegalLinks } from '@/components/common/LegalLinks';

/**
 * Rahmen der Anmeldeseiten. Immer dunkel, egal was unter „Darstellung“
 * gewählt ist (Owner-Vorgabe 2026-10-12): der eigene `FluentProvider` setzt
 * die Fluent-Variablen neu, und die Tailwind-Farben (`text-muted-foreground`
 * …) zeigen auf genau diese Variablen.
 */
export function AuthCard({
  title,
  subtitle,
  titleSize = 500,
  headerAction,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  /** Einstiegsseiten (Anmelden, Konto anlegen) zeigen den Titel eine Stufe größer. */
  titleSize?: 500 | 600;
  /** Sitzt oben rechts in der Karte, z. B. „Abmelden“ in der Einrichtung. */
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <FluentProvider theme={darkTheme}>
      <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden p-6 [color-scheme:dark]">
        {/* Hintergrundbild unscharf und abgedunkelt, damit Karte und Schrift ruhig
            davor stehen. `scale-110` versteckt den hellen Rand, den der Blur am
            Bildrand erzeugt. */}
        <div aria-hidden="true" className="fixed inset-0 -z-10 bg-black">
          <div className="absolute inset-0 scale-110 bg-[url(/login-background.webp)] bg-cover bg-center blur-md" />
          <div className="absolute inset-0 bg-black/45" />
        </div>
        <div className="flex w-full max-w-sm flex-col gap-6">
          {/* Kräftiger Schatten, damit die Karte vom Bild abhebt. Fluents eigener
              Kartenschatten ist ungelayert und schlägt Tailwind ohne `!`. */}
          <Card
            size="large"
            className="relative shadow-[0_8px_24px_rgba(0,0,0,0.45),0_32px_80px_rgba(0,0,0,0.7)]!"
          >
            {headerAction ? <div className="absolute top-3 right-3">{headerAction}</div> : null}
            <BautaktLogo className="self-center py-2" />
            <CardHeader
              header={
                <Text as="h1" size={titleSize} weight="semibold">
                  {title}
                </Text>
              }
              description={subtitle}
            />
            <div className="flex flex-col gap-4">{children}</div>
            {footer ? (
              <div className="text-center text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </Card>
          <LegalLinks />
        </div>
      </main>
    </FluentProvider>
  );
}
