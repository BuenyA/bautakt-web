import type { Metadata } from 'next';

import { Faq } from '@/components/marketing/Faq';
import { PricingTable } from '@/components/marketing/PricingTable';

export const metadata: Metadata = {
  title: 'Preise',
  description: 'Preise von Bautakt — pro Nutzer und Monat, monatlich kündbar.',
  alternates: { canonical: '/preise' },
};

export default function PreisePage() {
  return (
    <>
      <PricingTable />
      <Faq />
    </>
  );
}
