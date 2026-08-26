import type { Metadata } from 'next';

import { CtaSection } from '@/components/marketing/CtaSection';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';

export const metadata: Metadata = {
  title: 'Funktionen',
  description:
    'Aufträge, Zeiterfassung, Material, Angebote und Rechnungen, Team und Planung — der Funktionsumfang von Bautakt.',
  alternates: { canonical: '/funktionen' },
};

export default function FunktionenPage() {
  return (
    <>
      <FeatureGrid />
      <CtaSection />
    </>
  );
}
