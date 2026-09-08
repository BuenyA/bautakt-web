import type { Metadata } from 'next';

import { ContactStrip, PageIntro } from '@/components/cinema/Interior';
import { ProductExplorer } from '@/components/cinema/ProductExplorer';
import { t } from '@/lib/i18n';
export const metadata: Metadata = {
  title: t('site:product.label'),
  description: t('site:product.intro'),
  alternates: { canonical: '/funktionen' },
};
export default function ProductPage() {
  const facts = t('site:product.facts', { returnObjects: true }) as {
    title: string;
    body: string;
  }[];
  return (
    <div className="interior">
      <PageIntro
        label={t('site:product.label')}
        title={t('site:product.title')}
        description={t('site:product.intro')}
      />
      <ProductExplorer />
      <section className="capabilities">
        <h2>{t('site:product.factsTitle')}</h2>
        <div>
          {facts.map((fact, i) => (
            <article key={fact.title}>
              <small>0{i + 1}</small>
              <h3>{fact.title}</h3>
              <p>{fact.body}</p>
            </article>
          ))}
        </div>
      </section>
      <ContactStrip />
    </div>
  );
}
