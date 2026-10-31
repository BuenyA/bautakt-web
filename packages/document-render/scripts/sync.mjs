/**
 * Holt den Render-Kern aus bautakt-app in dieses Paket (bautakt-web#160).
 *
 * Quelle ist `bautakt-app/supabase/functions/finance-document-render`; dort
 * läuft derselbe Code als Edge Function. Dieses Paket hält eine wörtliche
 * Kopie unter `src/core/` und die Golden-Files aus
 * `bautakt-app/tools/einvoice-validation/golden/` unter `golden/`.
 *
 *   npm run sync -w @bautakt/document-render -- <pfad-zu-bautakt-app>
 *   npm run check:sync -w @bautakt/document-render -- <pfad-zu-bautakt-app>
 *
 * Ohne Pfad wird `../bautakt-app` neben diesem Repo angenommen.
 * Exitcodes: 0 = gleich bzw. kopiert, 1 = Drift, 2 = Aufruffehler.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');

/** Kern-Dateien: alles, was `render.ts` braucht, und nichts, was Deno braucht. */
export const CORE_FILES = [
  'render.ts',
  'draft.ts',
  'mapping.ts',
  'cii.ts',
  'pdf.ts',
  'types.ts',
  'assets.ts',
  'embeddedAssets.ts',
  'fingerprint.ts',
  'template.ts',
  'letterhead.ts',
];

const args = process.argv.slice(2);
const check = args.includes('--check');
const app = resolve(args.find((arg) => !arg.startsWith('--')) ?? join(pkg, '../../../bautakt-app'));
const renderer = join(app, 'supabase/functions/finance-document-render');
const goldenSource = join(app, 'tools/einvoice-validation/golden/render-golden.json');

if (!existsSync(renderer) || !existsSync(goldenSource)) {
  console.error(`Kein bautakt-app unter ${app} (Renderer oder Golden-File fehlt).`);
  process.exit(2);
}

const lf = (text) => text.replace(/\r\n/g, '\n');
const pairs = [
  ...CORE_FILES.map((file) => [join(renderer, file), join(pkg, 'src/core', file)]),
  [goldenSource, join(pkg, 'golden/render-golden.json')],
];

const drift = [];
for (const [from, to] of pairs) {
  const source = lf(readFileSync(from, 'utf8'));
  const current = existsSync(to) ? lf(readFileSync(to, 'utf8')) : null;
  if (current === source) continue;
  if (check) {
    drift.push(to.slice(pkg.length + 1));
  } else {
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, source);
    console.log(`kopiert: ${to.slice(pkg.length + 1)}`);
  }
}

if (check && drift.length > 0) {
  console.error('DRIFT gegenüber bautakt-app:');
  for (const file of drift) console.error(`  ${file}`);
  console.error('Quelle ist bautakt-app. `npm run sync -w @bautakt/document-render` ausführen.');
  process.exitCode = 1;
} else if (check) {
  console.log(`OK — ${pairs.length} Dateien identisch mit bautakt-app.`);
}
