/**
 * Impressum und Datenschutz liegen in der Web-App (`/impressum`,
 * `/datenschutz`). Den Wortlaut tauscht man nur in
 * `src/content/legal/*.md` — siehe die README dort.
 *
 * AGB: in der Web-App gibt es keine Seite. `published: false` nimmt den
 * Link aus der Oberfläche, statt auf eine tote Adresse zu zeigen. Sobald
 * eine echte Seite existiert, hier `published` setzen und die Route
 * ergänzen.
 *
 * Früher zeigten die Links auf die Marketing-Seite
 * (`bautakt-web-marketing.vercel.app`, #81). Die Marketing-App bleibt
 * unverändert und behält ihre eigenen Gerüste.
 */
import { routes } from '@/lib/routes';

export type LegalPageId = 'imprint' | 'privacy' | 'terms';

type LegalEntry = {
  id: LegalPageId;
  /** Pfad in der Web-App. `null`, solange es die Seite nicht gibt. */
  path: string | null;
  published: boolean;
};

const LEGAL_CATALOG: readonly LegalEntry[] = [
  { id: 'imprint', path: routes.imprint, published: true },
  { id: 'privacy', path: routes.privacy, published: true },
  { id: 'terms', path: null, published: false },
];

/** Seiten, die verlinkt werden. AGB ist absichtlich nicht dabei. */
export const LEGAL_PAGES: readonly LegalPageId[] = LEGAL_CATALOG.filter(
  (entry) => entry.published && entry.path,
).map((entry) => entry.id);

export function legalPath(page: LegalPageId): string | null {
  const entry = LEGAL_CATALOG.find((item) => item.id === page);
  if (!entry?.published || !entry.path) return null;
  return entry.path;
}
