import type { Metadata } from 'next';
import Link from 'next/link';

import { PageIntro } from '@/components/cinema/Interior';
import { ScenicMedia } from '@/components/cinema/ScenicMedia';
import { t } from '@/lib/i18n';
export const metadata: Metadata = {
  title: t('site:design.label'),
  robots: { index: false, follow: false },
  alternates: { canonical: '/design' },
};
export default function DesignPage() {
  return (
    <div className="interior design-sheet">
      <PageIntro
        label={t('site:design.label')}
        title={t('site:design.title')}
        description={t('site:design.body')}
      />
      <h2>{t('site:design.type')}</h2>
      <p className="design-specimen">
        {t('site:home.first')}
        <em>{t('site:home.second')}</em>
      </p>
      <h2>{t('site:design.colors')}</h2>
      <div className="design-palette">
        {[
          ['ink', 'dark'],
          ['paper', 'light'],
          ['primary', 'blue'],
          ['muted-foreground', 'secondary'],
        ].map(([token, key]) => (
          <div key={token}>
            <span style={{ background: `var(--${token})` }} />
            {t(`site:design.${key}`)}
          </div>
        ))}
      </div>
      <div className="design-actions">
        <Link className="solid-link" href="/funktionen#produktdemo">
          {t('site:action.quick')} ↗
        </Link>
        <Link className="underlined-link" href="/kontakt">
          {t('site:action.talk')} ↗
        </Link>
      </div>
      <h2>{t('site:design.images')}</h2>
      <div className="design-image">
        <ScenicMedia scene="intro" />
      </div>
    </div>
  );
}
