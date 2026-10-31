import DOMPurify from 'dompurify';

import { resizeImageToJpeg } from '@/lib/imageResize';

/**
 * Firmenlogo aus der Rechnungsvorlage, inklusive SVG.
 *
 * Der Bucket `company-images` erlaubt gemessen am 2026-10-30 nur `image/jpeg`
 * und 5 MiB (`file_size_limit` 5242880). Die Migration daneben lässt zusätzlich
 * `image/svg+xml` und `image/png` zu. pdf-lib bettet kein SVG ein
 * (`embedPng` / `embedJpg`), und `finance-document-render` erkennt das Logo
 * nur an PNG- oder JPEG-Magic-Bytes, höchstens 2 MiB. Deshalb bleibt
 * `companies.logo_image_url` ein Rasterpfad: bei SVG die PNG-Fassung, die
 * Vorschau, das PDF und die App laden. Die bereinigte SVG liegt daneben und
 * wird nur über `<img>` gezeigt.
 */

/** Dieselbe Obergrenze wie `storage.buckets.file_size_limit` von `company-images`. */
export const COMPANY_LOGO_MAX_BYTES = 5_242_880;

/**
 * `MAX_LOGO_BYTES` in der ausgelieferten Function `finance-document-render`.
 * Darüber lädt sie das Logo nicht, und der Beleg erschiene ohne Logo.
 */
export const COMPANY_LOGO_PNG_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Größter Logokasten der beiden Layouts, in Punkt:
 * Standard 150 × 54 (`pdf.ts`), Briefbogen 250 × 92 (`letterhead.ts`).
 * Die PNG deckt den größeren Kasten mit 3 px je Punkt ab, mindestens 600 px breit.
 */
const PRINT_W_PT = 250;
const PRINT_H_PT = 92;
const PIXEL_SCALE = 3;
const MIN_WIDTH_PX = 600;
const MAX_EDGE_PX = 2400;

const RASTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type CompanyLogoErrorCode =
  | 'UNSUPPORTED_LOGO'
  | 'IMAGE_UNREADABLE'
  | 'IMAGE_TOO_LARGE'
  | 'SVG_NO_SIZE'
  | 'SVG_EMPTY'
  | 'LOGO_PNG_TOO_LARGE';

export class CompanyLogoError extends Error {
  readonly code: CompanyLogoErrorCode;

  constructor(code: CompanyLogoErrorCode) {
    super(code);
    this.name = 'CompanyLogoError';
    this.code = code;
  }
}

export type PreparedCompanyLogo =
  { kind: 'jpeg'; blob: Blob } | { kind: 'svg'; svg: Blob; png: Blob };

const FORBIDDEN_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'embed',
  'object',
  'audio',
  'video',
  'canvas',
  'link',
  'meta',
  'handler',
  'animate',
  'animatecolor',
  'animatetransform',
  'animatemotion',
  'set',
]);

/** Elemente, die ohne lokale Referenz nichts Zeichnbares sind. */
const REFERENCE_ONLY = new Set([
  'use',
  'image',
  'feimage',
  'mpath',
  'tref',
  'glyphref',
  'textpath',
]);

const GRAPHIC_TAGS = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'image',
  'use',
]);

/**
 * DOMPurify 3.4, Profil `svg` plus `svgFilters`.
 *
 * Das Profil ist eine Allowlist und streicht `script`, `foreignObject`,
 * `animate` und `set` bereits. Zusätzlich verboten: `iframe`, `embed`,
 * `object` und die SMIL-Reste `animateColor`, `animateTransform`,
 * `animateMotion`. `<use>` fügt das Profil nicht hinzu; wir erlauben es und
 * behalten im Nachlauf nur Verweise auf `#id` im selben Dokument.
 *
 * Der Nachlauf (nicht DOMPurify, dessen URI-Regeln `https:` erlauben und
 * `style` ungeprüft durchlassen) entfernt:
 * `on*`-Handler außer `orientation`, `javascript:`- und `data:`-URLs,
 * `http(s)` und protokollrelative URLs in `href` / `xlink:href` / `src` /
 * `style` / `url()`, `<use>` und `<image>` mit Ziel außerhalb, `<style>` mit
 * `@import` oder externem `url()`. `url(#id)` und `xmlns` der SVG-Namespaces
 * bleiben.
 */
const PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ['use'],
  FORBID_TAGS: [
    'script',
    'foreignObject',
    'iframe',
    'embed',
    'object',
    'animate',
    'animateColor',
    'animateTransform',
    'animateMotion',
    'set',
  ],
  ALLOW_DATA_ATTR: false,
  SAFE_FOR_XML: true,
};

const LENGTH = /^([+-]?(?:\d+\.?\d*|\.\d+))(px|pt|pc|in|cm|mm)?$/i;
const TO_PX: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
};

export async function prepareCompanyLogo(file: File): Promise<PreparedCompanyLogo> {
  if (isSvgFile(file)) return prepareSvgLogo(file);
  if (!RASTER_TYPES.has(file.type)) throw new CompanyLogoError('UNSUPPORTED_LOGO');
  const blob = await resizeImageToJpeg(file, 512, 0.8);
  return { kind: 'jpeg', blob };
}

function isSvgFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/svg+xml' || type === 'image/svg') return true;
  if (!file.name.toLowerCase().endsWith('.svg')) return false;
  return (
    type === '' ||
    type === 'text/xml' ||
    type === 'application/xml' ||
    type === 'text/plain' ||
    type === 'application/octet-stream'
  );
}

async function prepareSvgLogo(file: File): Promise<Extract<PreparedCompanyLogo, { kind: 'svg' }>> {
  if (file.size > COMPANY_LOGO_MAX_BYTES) throw new CompanyLogoError('IMAGE_TOO_LARGE');
  const source = await file.text();
  const svg = sanitizeSvg(source);
  const size = usableSize(svg);
  if (!size) throw new CompanyLogoError('SVG_NO_SIZE');
  if (!hasGraphic(svg)) throw new CompanyLogoError('SVG_EMPTY');

  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Ohne Breite und Höhe hat ein `<img>` oft keine Eigengröße und fällt auf den
  // Alternativtext zurück. Die viewBox bleibt die Zeichenfläche.
  if (!svg.getAttribute('width')) svg.setAttribute('width', String(size.w));
  if (!svg.getAttribute('height')) svg.setAttribute('height', String(size.h));
  const xml = new XMLSerializer().serializeToString(svg);
  if (/<\s*(script|foreignobject|iframe|embed|object)\b/i.test(xml)) {
    throw new CompanyLogoError('IMAGE_UNREADABLE');
  }
  const svgBytes = new TextEncoder().encode(xml);
  if (svgBytes.byteLength > COMPANY_LOGO_MAX_BYTES) throw new CompanyLogoError('IMAGE_TOO_LARGE');

  const png = await rasterizeSvg(svg, size);
  return {
    kind: 'svg',
    svg: new Blob([svgBytes], { type: 'image/svg+xml' }),
    png,
  };
}

function sanitizeSvg(source: string): SVGSVGElement {
  // Erst als XML lesen. DOMPurify parst sonst als HTML, und ein `<embed>`
  // schluckt dort die folgenden Geschwister, bevor die Allowlist sie rettet.
  const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
  const xmlRoot = xml.documentElement;
  if (!xml.querySelector('parsererror') && xmlRoot.localName.toLowerCase() === 'svg') {
    const svg = xmlRoot as unknown as SVGSVGElement;
    if (svg.querySelectorAll('*').length > 20_000) throw new CompanyLogoError('IMAGE_UNREADABLE');
    stripComments(svg);
    harden(svg);
    return purifyAndHarden(new XMLSerializer().serializeToString(svg));
  }
  return purifyAndHarden(source);
}

function purifyAndHarden(source: string): SVGSVGElement {
  const cleaned = DOMPurify.sanitize(source, PURIFY_CONFIG);
  if (!cleaned.trim()) throw new CompanyLogoError('IMAGE_UNREADABLE');
  const doc = new DOMParser().parseFromString(cleaned, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new CompanyLogoError('IMAGE_UNREADABLE');
  const root = doc.documentElement;
  if (root.localName.toLowerCase() !== 'svg') throw new CompanyLogoError('IMAGE_UNREADABLE');
  const svg = root as unknown as SVGSVGElement;
  if (svg.querySelectorAll('*').length > 20_000) throw new CompanyLogoError('IMAGE_UNREADABLE');
  stripComments(svg);
  harden(svg);
  return svg;
}

function stripComments(svg: SVGSVGElement): void {
  const comments: Comment[] = [];
  const walker = svg.ownerDocument.createTreeWalker(svg, NodeFilter.SHOW_COMMENT);
  let current = walker.nextNode();
  while (current) {
    comments.push(current as Comment);
    current = walker.nextNode();
  }
  for (const comment of comments) comment.remove();
}

function harden(svg: SVGSVGElement): void {
  const elements = [svg, ...svg.querySelectorAll('*')];
  for (const node of elements) {
    if (!node.isConnected) continue;
    const el = node as Element;
    const tag = el.localName.toLowerCase();
    if (FORBIDDEN_TAGS.has(tag)) {
      el.remove();
      continue;
    }
    if (tag === 'style' && cssIsUnsafe(el.textContent ?? '')) {
      el.remove();
      continue;
    }
    for (const attr of [...el.attributes]) dropUnsafeAttribute(el, attr);
    if (REFERENCE_ONLY.has(tag) && !localHref(el)) el.remove();
  }
}

const SVG_NAMESPACES = new Set(['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink']);

function dropUnsafeAttribute(el: Element, attr: Attr): void {
  const name = attr.name.toLowerCase();
  // `xmlns` trägt absichtlich `http://`. Nur die beiden SVG-Namespaces bleiben.
  if (name === 'xmlns' || name.startsWith('xmlns:')) {
    if (!SVG_NAMESPACES.has(attr.value.trim())) removeAttribute(el, attr);
    return;
  }
  const drop =
    (name.startsWith('on') && name !== 'orientation') ||
    isUnsafeReference(name, attr.value) ||
    (name === 'style' && cssIsUnsafe(attr.value));
  if (drop) removeAttribute(el, attr);
}

function removeAttribute(el: Element, attr: Attr): void {
  if (attr.namespaceURI) el.removeAttributeNS(attr.namespaceURI, attr.localName);
  else el.removeAttribute(attr.localName);
}

/** Steuerzeichen und Leerzeichen entfernen, damit `java\nscript:` nicht durchrutscht. */
function compactUrl(value: string): string {
  let out = '';
  for (const char of value) {
    if (char.charCodeAt(0) > 32) out += char;
  }
  return out;
}

function isUnsafeReference(name: string, value: string): boolean {
  const compact = compactUrl(value);
  if (/javascript:/i.test(compact) || /data:/i.test(compact)) return true;
  if (name === 'href' || name === 'xlink:href' || name === 'src') return !isLocalFragment(value);
  if (/https?:/i.test(compact)) return true;
  return unsafeUrlCall(value);
}

function isLocalFragment(value: string): boolean {
  const compact = compactUrl(value);
  return /^#[^"'()\\\s:/]+$/.test(compact);
}

function localHref(el: Element): boolean {
  const href = el.getAttribute('href') ?? el.getAttribute('xlink:href');
  return href != null && isLocalFragment(href);
}

function cssIsUnsafe(css: string): boolean {
  if (/@import/i.test(css) || /expression\s*\(/i.test(css) || /javascript\s*:/i.test(css)) {
    return true;
  }
  return unsafeUrlCall(css);
}

/** `url(#id)` ist ein Verweis im Dokument. Jedes andere `url()` ist extern. */
function unsafeUrlCall(value: string): boolean {
  for (const match of value.matchAll(/url\s*\(\s*(['"]?)\s*([^)'"]*)\1\s*\)/gi)) {
    const target = compactUrl(match[2] ?? '');
    if (!target.startsWith('#')) return true;
  }
  return false;
}

function hasGraphic(svg: SVGSVGElement): boolean {
  return [...svg.querySelectorAll('*')].some((el) => GRAPHIC_TAGS.has(el.localName.toLowerCase()));
}

function usableSize(svg: SVGSVGElement): { w: number; h: number } | null {
  const viewBox = parseViewBox(svg.getAttribute('viewBox'));
  if (viewBox) return viewBox;
  const width = parseLength(svg.getAttribute('width'));
  const height = parseLength(svg.getAttribute('height'));
  if (width && height) return { w: width, h: height };
  if (width) return { w: width, h: width };
  return null;
}

function parseViewBox(value: string | null): { w: number; h: number } | null {
  if (!value) return null;
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const w = parts[2] ?? 0;
  const h = parts[3] ?? 0;
  if (w <= 0 || h <= 0) return null;
  return { w, h };
}

function parseLength(value: string | null): number | null {
  if (!value) return null;
  const match = LENGTH.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = (match[2] ?? 'px').toLowerCase();
  return amount * (TO_PX[unit] ?? 1);
}

function rasterPixels(size: { w: number; h: number }): { w: number; h: number } {
  const aspect = size.w / size.h;
  const boxAspect = PRINT_W_PT / PRINT_H_PT;
  const ptW = aspect >= boxAspect ? PRINT_W_PT : PRINT_H_PT * aspect;
  const ptH = aspect >= boxAspect ? PRINT_W_PT / aspect : PRINT_H_PT;
  let pxW = Math.max(1, Math.round(ptW * PIXEL_SCALE));
  let pxH = Math.max(1, Math.round(ptH * PIXEL_SCALE));
  if (pxW < MIN_WIDTH_PX) {
    const scale = MIN_WIDTH_PX / pxW;
    pxW = MIN_WIDTH_PX;
    pxH = Math.max(1, Math.round(pxH * scale));
  }
  const longEdge = Math.max(pxW, pxH);
  if (longEdge > MAX_EDGE_PX) {
    const scale = MAX_EDGE_PX / longEdge;
    pxW = Math.max(1, Math.round(pxW * scale));
    pxH = Math.max(1, Math.round(pxH * scale));
  }
  return { w: pxW, h: pxH };
}

/**
 * Transparente PNG. pdf-lib legt einen Alphakanal als `/SMask` ab (DeviceGray,
 * ohne `/Interpolate`). PDF/A-3 erlaubt Transparenz. Ist ein Pixel voll deckend,
 * schreibt pdf-lib keine Maske.
 */
async function rasterizeSvg(svg: SVGSVGElement, size: { w: number; h: number }): Promise<Blob> {
  const target = rasterPixels(size);
  let width = target.w;
  let height = target.h;
  let png = await drawSvg(svg, size, width, height);
  while (png.size > COMPANY_LOGO_PNG_MAX_BYTES && width > MIN_WIDTH_PX) {
    width = Math.max(MIN_WIDTH_PX, Math.round(width * 0.75));
    height = Math.max(1, Math.round(width / (target.w / target.h)));
    png = await drawSvg(svg, size, width, height);
    if (width === MIN_WIDTH_PX) break;
  }
  if (png.size > COMPANY_LOGO_PNG_MAX_BYTES) throw new CompanyLogoError('LOGO_PNG_TOO_LARGE');
  return png;
}

async function drawSvg(
  svg: SVGSVGElement,
  size: { w: number; h: number },
  width: number,
  height: number,
): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${size.w} ${size.h}`);
  }
  const markup = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new CompanyLogoError('IMAGE_UNREADABLE'));
    });
    image.src = url;
    await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new CompanyLogoError('IMAGE_UNREADABLE');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new CompanyLogoError('IMAGE_UNREADABLE');
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}
