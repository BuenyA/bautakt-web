import type { NextConfig } from 'next';

import { IS_PRODUCTION_SITE } from './lib/site';

const nextConfig: NextConfig = {
  /**
   * Die geteilten Pakete werden als TypeScript-Quelle ausgeliefert (kein
   * Build-Schritt, siehe AGENTS.md). Next muss sie deshalb selbst
   * transpilieren.
   */
  transpilePackages: ['@bautakt/ui'],

  /**
   * Dritte Indexierungs-Sperre neben robots.txt und dem Meta-Tag.
   *
   * Vercel setzt `X-Robots-Tag: noindex` nur auf *Preview*-Deployments.
   * Ein Production-Deployment auf `.vercel.app` (Hobby, ohne Custom Domain)
   * bleibt ohne diesen Header crawlbar. `headers()` greift auch auf
   * `/robots.txt` und statische HTML-Antworten — Middleware wuerde
   * Metadata-Routen typischerweise ausnehmen.
   *
   * Dieselbe Entscheidung wie `IS_PRODUCTION_SITE`: gesetzt wird der Header
   * nur, wenn die Seite *nicht* die oeffentliche bautakt.com-Produktion ist.
   * Go-live = `NEXT_PUBLIC_SITE_URL=https://bautakt.com` + Redeploy → Header
   * faellt weg.
   */
  async headers() {
    if (IS_PRODUCTION_SITE) return [];

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
