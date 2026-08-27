import type { MetadataRoute } from 'next';

import { allRoutes, legalNav } from '@/content/nav';
import { absoluteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const legalPaths = new Set(legalNav.map((item) => item.href));
  const now = new Date();

  return allRoutes.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: legalPaths.has(path) ? 'yearly' : 'monthly',
    priority: path === '/' ? 1 : legalPaths.has(path) ? 0.3 : 0.8,
  }));
}
