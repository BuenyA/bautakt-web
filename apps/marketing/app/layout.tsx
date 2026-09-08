import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Colophon, Masthead } from '@/components/cinema/SiteFrame';
import { media } from '@/content/media';
import { t } from '@/lib/i18n';
import { IS_PRODUCTION_SITE, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: t('site:seo.title'), template: t('site:seo.template') },
  description: t('site:seo.description'),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    title: t('site:seo.title'),
    description: t('site:seo.description'),
    ...(media.intro.poster ? { images: [{ url: media.intro.poster }] } : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: t('site:seo.title'),
    description: t('site:seo.description'),
  },
  ...(!IS_PRODUCTION_SITE ? { robots: { index: false, follow: false, nocache: true } } : {}),
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Masthead />
        <main id="hauptinhalt" tabIndex={-1}>
          {children}
        </main>
        <Colophon />
      </body>
    </html>
  );
}
