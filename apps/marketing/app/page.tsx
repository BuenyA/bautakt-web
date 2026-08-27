import { CtaSection } from '@/components/marketing/CtaSection';
import { Faq } from '@/components/marketing/Faq';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { Hero } from '@/components/marketing/Hero';

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <Faq />
      <CtaSection />
    </>
  );
}
