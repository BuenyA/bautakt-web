import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import base from './base.js';

/**
 * Basis plus eslint-config-next.
 *
 * eslint-config-next bleibt drin, weil es die Regeln traegt, die Next-spezifische
 * Brueche fangen (no-html-link-for-pages, Image-/Font-Regeln, die Server-/Client-
 * Grenze). Das ist der Grund, warum in diesem Repo ueberall ESLint laeuft und
 * nicht oxlint.
 */
export default [...base, ...nextVitals, ...nextTs];
