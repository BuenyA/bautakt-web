/**
 * Render-Kern der Ausgangsbelege für den Browser (bautakt-web#160).
 *
 * `core/` ist eine wörtliche Kopie aus bautakt-app
 * (`supabase/functions/finance-document-render`), wo derselbe Code als Edge
 * Function läuft. Nie hier ändern: dort ändern, `npm run sync` ausführen.
 * Der Golden-Test beweist, dass die Kopie dieselben Bytes erzeugt.
 */

export { type DraftInput, InvalidDraftError, parseDraftInput } from './core/draft.ts';
export type { SalesDocRow, SalesLineRow } from './core/mapping.ts';
export {
  type PreparedRender,
  prepareRender,
  type RenderBundle,
  type RenderedDocument,
  renderPdf,
} from './core/render.ts';
export {
  type InvoiceTemplateRow,
  LETTERHEAD_DEFAULTS,
  type LetterheadLayout,
  TEMPLATE_TEXT_TYPES,
  type TemplateBankAccount,
  type TemplateLayoutKey,
  templateLayoutKey,
  templateTextsFor,
} from './core/template.ts';
