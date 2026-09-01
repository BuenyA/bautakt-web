import type { MetadataRoute } from 'next';

import { absoluteUrl, IS_PRODUCTION_SITE } from '@/lib/site';

/**
 * ⚠️ Ausserhalb von bautakt.com wird alles gesperrt — siehe `IS_PRODUCTION_SITE`.
 *
 * Das allein reicht nicht: `Disallow` verhindert das *Crawlen*, nicht das
 * *Indexieren*. Eine von woanders verlinkte URL kann Google trotzdem in den
 * Index nehmen. Dazu kommen das Root-Layout (`noindex, nofollow, nocache`) und
 * der `X-Robots-Tag`-Header in `next.config.ts`. Alle drei gehoeren zusammen.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_SITE) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
