import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { absoluteUrl, site, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
          // eslint-disable-next-line react/no-danger -- statisches, selbst erzeugtes JSON-LD
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
