import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { SalesDocRow, SalesLineRow } from './index.ts';
import { prepareRender, type RenderBundle, renderPdf } from './index.ts';

type GoldenCase = {
  name: string;
  input: { doc: SalesDocRow; lines: SalesLineRow[]; bundle: RenderBundle };
  expected: {
    fingerprint: string;
    xmlSha256: string | null;
    pdfSha256: string;
    pageCount: number;
    warnings: string[];
  };
};

const golden = JSON.parse(
  readFileSync(new URL('../golden/render-golden.json', import.meta.url), 'utf8'),
) as { today: string; now: string; cases: GoldenCase[] };

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

// Die Hashes stammen vom Server-Kern in bautakt-app (tools/einvoice-validation/golden.ts).
// Gleiche Hashes heißt: Browser-Vorschau und Edge Function erzeugen dasselbe PDF.
describe('Render-Kern gegen Golden-Files aus bautakt-app', () => {
  it.each(golden.cases.map((entry) => [entry.name, entry] as const))('%s', async (_name, entry) => {
    const prepared = await prepareRender({ ...entry.input, today: golden.today });
    const rendered = await renderPdf(prepared, null, new Date(golden.now));

    expect(rendered.fingerprint).toBe(entry.expected.fingerprint);
    expect(rendered.xml === null ? null : sha256(rendered.xml)).toBe(entry.expected.xmlSha256);
    expect(rendered.pageCount).toBe(entry.expected.pageCount);
    expect(rendered.warnings).toEqual(entry.expected.warnings);
    expect(sha256(rendered.pdf)).toBe(entry.expected.pdfSha256);
  });
});
