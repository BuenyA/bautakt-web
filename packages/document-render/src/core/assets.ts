/**
 * Schriften und ICC-Profil fuer den PDF/A-Renderer.
 *
 * Die Bytes kommen aus `embeddedAssets.ts`, nicht von der Platte. `Deno.readFile`
 * auf `./assets/` hat in Deployment v9 gefehlt: `static_files` landet nur im
 * eszip, wenn der Deploy mit laufendem Docker buendelt. Ohne Docker nimmt die
 * CLI den API-Upload, die Binaerdateien fehlen, und der erste Render wirft —
 * die App zeigt dann „Die Vorschau konnte nicht erzeugt werden“
 * (Smoke 2026-09-28). Ein TS-Export kann der Bundler nicht auslassen.
 *
 * Quelle der Bytes bleiben `./assets/*.ttf` und `./assets/sRGB.icc`
 * (Lizenzen: ./assets/NOTICE.txt). Nach einem Austausch `embeddedAssets.ts`
 * neu erzeugen.
 *
 * Der Validierungs-Harness (`tools/einvoice-validation`) liest die Dateien direkt vom Dateisystem und ruft
 * `buildInvoicePdf` mit eigenen Assets auf — er nutzt diese Funktion nicht.
 */

import type { PdfAssets } from "./types.ts";
import {
  ICC_PROFILE_B64,
  REGULAR_FONT_B64,
  SEMIBOLD_FONT_B64,
} from "./embeddedAssets.ts";

function decodeBase64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let cached: Omit<PdfAssets, "logo"> | null = null;

/** Laedt Schriften und ICC-Profil einmal pro Instanz. */
export function loadPdfAssets(): Omit<PdfAssets, "logo"> {
  if (cached) return cached;
  cached = {
    regularFont: decodeBase64(REGULAR_FONT_B64),
    semiBoldFont: decodeBase64(SEMIBOLD_FONT_B64),
    iccProfile: decodeBase64(ICC_PROFILE_B64),
  };
  return cached;
}
