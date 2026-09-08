import type { Metadata } from 'next';
import Link from 'next/link';

import { PageIntro } from '@/components/cinema/Interior';
import { t } from '@/lib/i18n';
export const metadata: Metadata = {
  title: t('site:prices.label'),
  description: t('site:prices.intro'),
  alternates: { canonical: '/preise' },
};
export default function PricingPage() {
  const points = t('site:prices.points', { returnObjects: true }) as string[];
  return (
    <div className="interior">
      <PageIntro
        label={t('site:prices.label')}
        title={t('site:prices.title')}
        description={t('site:prices.intro')}
      />
      <section className="pricing-conversation">
        <div className="price-quote">
          <p className="eyeline">{t('site:prices.unit')}</p>
          <h2>{t('site:prices.price')}</h2>
          <p>{t('site:prices.body')}</p>
          <Link className="solid-link" href="/kontakt">
            {t('site:prices.cta')} ↗
          </Link>
          <small>{t('site:prices.note')}</small>
        </div>
        <div className="price-scope">
          <h3>{t('site:prices.included')}</h3>
          {points.map((point, i) => (
            <p key={point}>
              <span>0{i + 1}</span>
              {point}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
