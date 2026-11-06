import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { prepareQuoteRender, type QuoteRenderInput, renderPdf } from './index.ts';

type QuoteGoldenCase = {
  name: string;
  input: QuoteRenderInput;
  expected: {
    fingerprint: string;
    netCents: number;
    grossCents: number;
    pdfSha256: string;
    pageCount: number;
    warnings: string[];
  };
};

const golden = JSON.parse(
  readFileSync(new URL('../golden/quote-golden.json', import.meta.url), 'utf8'),
) as { today: string; now: string; cases: QuoteGoldenCase[] };

const sha256 = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');

// Angebote (bautakt-app#183): Hashes vom Server-Kern (tools/einvoice-validation/quote-golden.ts).
describe('Angebots-Render gegen Golden-Files aus bautakt-app', () => {
  it.each(golden.cases.map((entry) => [entry.name, entry] as const))('%s', async (_name, entry) => {
    const prepared = await prepareQuoteRender(entry.input);
    const rendered = await renderPdf(prepared, null, new Date(golden.now));

    expect(rendered.fingerprint).toBe(entry.expected.fingerprint);
    expect(rendered.data.totals.taxBasisTotalCents).toBe(entry.expected.netCents);
    expect(rendered.data.totals.grandTotalCents).toBe(entry.expected.grossCents);
    expect(rendered.pageCount).toBe(entry.expected.pageCount);
    expect(rendered.warnings).toEqual(entry.expected.warnings);
    expect(sha256(rendered.pdf)).toBe(entry.expected.pdfSha256);
  });
});
