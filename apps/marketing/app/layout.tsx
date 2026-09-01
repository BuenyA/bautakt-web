import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { absoluteUrl, IS_PRODUCTION_SITE, site, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  /**
   * ⚠️ Sperrt die Indexierung ausserhalb von bautakt.com. `robots.txt` allein
   * genuegt nicht — `Disallow` verhindert das Crawlen, nicht das Indexieren.
   * Der `X-Robots-Tag`-Header in `next.config.ts` ist die dritte Ebene.
   *
   * In Produktion bleibt das Feld leer, damit die Standardregeln gelten und die
   * Rechtsseiten ihr eigenes `robots: { index: false }` weiterhin selbst setzen.
   */
  ...(IS_PRODUCTION_SITE
    ? {}
    : {
        robots: {
          index: false,
          follow: false,
          nocache: true,
          googleBot: { index: false, follow: false },
        },
      }),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: site.locale,
    url: SITE_URL,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
};

/**
 * Bewusst mit explizit getypten children statt mit Nexts globalem
 * LayoutProps<"/">: dieser Typ wird erst von `next typegen` erzeugt, ein
 * frischer Clone koennte sonst vor dem ersten Build nicht typechecken.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    applicationCategory: 'BusinessApplication',
    description: site.description,
    url: absoluteUrl('/'),
    offers: { '@type': 'Offer', priceCurrency: 'EUR' },
  };

  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-svh antialiased">
        <Header />
        {children}
        <Footer />
        <script
          type="application/ld+json"
          // Statisches, selbst erzeugtes JSON-LD — keine Fremddaten.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
