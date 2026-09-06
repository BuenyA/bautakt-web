import type { Metadata } from 'next';

import { CtaSection } from '@/components/marketing/CtaSection';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';

export const metadata: Metadata = {
  title: 'Funktionen',
  description:
    'Aufträge, Zeiterfassung, Material, Angebote und Rechnungen, Team und Planung. Der Funktionsumfang von Bautakt.',
  alternates: { canonical: '/funktionen' },
};

export default function FunktionenPage() {
  return (
    <>
      <FeatureGrid variant="page" />
      <CtaSection />
    </>
  );
}
