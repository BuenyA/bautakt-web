import type { Metadata } from 'next';

import { ContactStrip, PageIntro } from '@/components/cinema/Interior';
import { ScenicMedia } from '@/components/cinema/ScenicMedia';
import { t } from '@/lib/i18n';
export const metadata: Metadata = {
  title: t('site:about.label'),
  description: t('site:about.intro'),
  alternates: { canonical: '/ueber-uns' },
};
export default function AboutPage() {
  const principles = t('site:about.principles', { returnObjects: true }) as {
    title: string;
    body: string;
  }[];
  return (
    <div className="interior">
      <PageIntro
        label={t('site:about.label')}
        title={t('site:about.title')}
        description={t('site:about.intro')}
      />
      <div className="about-image">
        <ScenicMedia scene="intro" />
      </div>
      <section className="about-statement">
        <h2>{t('site:about.heading')}</h2>
        <p>{t('site:about.body')}</p>
      </section>
      <section className="principles">
        {principles.map((item, i) => (
          <article key={item.title}>
            <small>0{i + 1}</small>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
      <ContactStrip>{t('site:about.cta')}</ContactStrip>
    </div>
  );
}
