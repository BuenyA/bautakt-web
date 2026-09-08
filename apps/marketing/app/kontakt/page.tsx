import type { Metadata } from 'next';

import { PageIntro } from '@/components/cinema/Interior';
import { t } from '@/lib/i18n';
import { SUPPORT_EMAIL } from '@/lib/site';
export const metadata: Metadata = {
  title: t('site:contact.label'),
  description: t('site:contact.intro'),
  alternates: { canonical: '/kontakt' },
};
export default function ContactPage() {
  const points = t('site:contact.points', { returnObjects: true }) as string[];
  const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('site:contact.subject'))}&body=${encodeURIComponent(t('site:contact.body'))}`;
  return (
    <div className="interior">
      <PageIntro
        label={t('site:contact.label')}
        title={t('site:contact.title')}
        description={t('site:contact.intro')}
      />
      <section className="contact-grid">
        <div className="contact-address">
          <p className="eyeline">{t('site:contact.email')}</p>
          <a href={mail}>
            {SUPPORT_EMAIL}
            <span aria-hidden="true">↗</span>
          </a>
          <p>{t('site:contact.note')}</p>
        </div>
        <div className="conversation-prep">
          <p className="eyeline">{t('site:contact.prepare')}</p>
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
