#!/usr/bin/env node
/**
 * Prüft, ob Impressum, Datenschutzerklärung und AGB noch Platzhalter tragen
 * (#81): den sichtbaren `TodoHinweis` oder „Lorem ipsum“.
 *
 * Standard: Warnung im Build-Log, der Build läuft weiter — die Texte kommen
 * von Geschäftsführung bzw. Anwalt, und bis dahin sollen Previews und
 * Marketing-Änderungen nicht blockiert sein.
 *
 * `LEGAL_STRICT=1` macht daraus einen harten Fehler. Das ist der
 * Go-live-Schalter: einmal im Vercel-Projekt `bautakt-marketing` (Production)
 * setzen, dann geht kein Build mit Platzhaltern mehr live. Die Variable steht
 * in `turbo.json` unter `build.env`, sonst filtert Turbos Strict-Mode sie weg.
 *
 * Agenten schreiben keinen Rechtstext — siehe AGENTS.md.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const legalDir = join(root, 'apps/marketing/app/(rechtliches)');
const PATTERNS = [
  { label: 'TodoHinweis', regex: /<TodoHinweis\b/ },
  { label: 'Lorem ipsum', regex: /lorem\s+ipsum/i },
];

function pageFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pageFiles(path);
    return /^page\.(tsx|ts|mdx?)$/.test(name) ? [path] : [];
  });
}

const findings = pageFiles(legalDir).flatMap((file) => {
  const text = readFileSync(file, 'utf8');
  return PATTERNS.filter(({ regex }) => regex.test(text)).map(({ label }) => ({
    file: relative(root, file).replaceAll('\\', '/'),
    label,
  }));
});

const strict = process.env.LEGAL_STRICT === '1' || process.env.LEGAL_STRICT === 'true';

if (findings.length === 0) {
  console.log('[rechtstexte] Keine Platzhalter gefunden.');
  process.exit(0);
}

const lines = findings.map(({ file, label }) => `  - ${file}: ${label}`).join('\n');
const message = `[rechtstexte] Rechtstexte enthalten noch Platzhalter:\n${lines}`;

if (strict) {
  console.error(`${message}\n[rechtstexte] LEGAL_STRICT ist gesetzt — Build bricht ab.`);
  process.exit(1);
}

console.warn(
  `${message}\n[rechtstexte] Nur Warnung. Vor dem Go-live LEGAL_STRICT=1 setzen, dann bricht der Build hier ab.`,
);
