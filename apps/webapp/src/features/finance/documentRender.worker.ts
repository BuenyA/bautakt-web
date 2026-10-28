/**
 * Web Worker der Live-Vorschau (bautakt-web#160): rendert den ungespeicherten
 * Entwurf mit demselben Kern wie `finance-document-render`
 * (`@bautakt/document-render`). Im Worker, weil Schriften einbetten und das
 * PDF/A bauen sonst beim Tippen den Editor einfrieren lassen.
 *
 * Daten lädt der Worker nie selbst: Firma, Kunde, Abschläge und Logo kommen
 * als Bündel aus der Function (`bundle_only`), der Formularstand aus dem
 * Editor. `parseDraftInput` bringt ihn in dieselbe Form wie auf dem Server.
 */

import { parseDraftInput, prepareRender, renderPdf } from '@bautakt/document-render';

import type { RenderRequest, RenderResponse } from './clientRender';

self.onmessage = async (event: MessageEvent<RenderRequest>) => {
  const { id, draft, bundle, logo } = event.data;
  try {
    const parsed = parseDraftInput(draft);
    if (!parsed) throw new Error('DRAFT_EMPTY');
    const prepared = await prepareRender({ doc: parsed.doc, lines: parsed.lines, bundle });
    const rendered = await renderPdf(prepared, logo);
    const response: RenderResponse = {
      id,
      ok: true,
      pdf: rendered.pdf,
      warnings: rendered.warnings,
      fingerprint: rendered.fingerprint,
    };
    self.postMessage(response, { transfer: [rendered.pdf.buffer] });
  } catch (cause) {
    const response: RenderResponse = {
      id,
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause),
    };
    self.postMessage(response);
  }
};
