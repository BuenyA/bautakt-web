import type { MetadataRoute } from 'next';

import { absoluteUrl, IS_PRODUCTION_SITE } from '@/lib/site';
/** Vorschau und Rechtstext-Gerüste werden nicht freigegeben. */
export default function robots(): MetadataRoute.Robots {
  return IS_PRODUCTION_SITE
    ? {
        rules: {
          userAgent: '*',
          allow: '/',
          disallow: ['/design', '/impressum', '/datenschutz', '/agb'],
        },
        sitemap: absoluteUrl('/sitemap.xml'),
      }
    : { rules: { userAgent: '*', disallow: '/' } };
}
