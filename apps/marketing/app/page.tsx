import { CtaSection } from '@/components/marketing/CtaSection';
import { Faq } from '@/components/marketing/Faq';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { Hero } from '@/components/marketing/Hero';
import { PricingFeatured } from '@/components/marketing/PricingFeatured';
import { Tagesablauf } from '@/components/marketing/Tagesablauf';
import { TrustBar } from '@/components/marketing/TrustBar';

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Tagesablauf />
      <FeatureGrid />
      <PricingFeatured />
      <Faq />
      <CtaSection />
    </>
  );
}
