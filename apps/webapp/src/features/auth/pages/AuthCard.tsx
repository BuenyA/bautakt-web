import { Card, CardHeader, Text } from '@fluentui/react-components';
import type { ReactNode } from 'react';

import { BautaktLogo } from '@/components/brand/BautaktLogo';
import { LegalLinks } from '@/components/common/LegalLinks';

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
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden p-6">
      {/* Hintergrundbild unscharf und abgedunkelt, damit Karte und Schrift ruhig
          davor stehen. `scale-110` versteckt den hellen Rand, den der Blur am
          Bildrand erzeugt. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-black">
        <div className="absolute inset-0 scale-110 bg-[url(/login-background.webp)] bg-cover bg-center blur-md" />
        <div className="absolute inset-0 bg-black/45" />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* Über dem dunklen Bild immer hell, auch im hellen Modus. */}
        <BautaktLogo className="self-center text-white drop-shadow" />
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
          {/* In der Karte statt darunter: ein Link in Markenblau wäre auf dem
              dunklen Bild kaum lesbar. */}
          {footer ? (
            <div className="text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </Card>
        <LegalLinks onImage />
      </div>
    </main>
  );
}
