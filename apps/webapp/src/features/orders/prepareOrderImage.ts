import { takenAtFromJpegBytes } from './readJpegTakenAt';

/**
 * Breite, auf die vorhandene Auftragsfotos gebracht sind.
 *
 * Gemessen 2026-10-08: alle 10 Zeilen in `order_images` haben `width = 1920`
 * und sind höher als breit. Die Handy-App war aus dieser Umgebung nicht
 * lesbar, deshalb ist 1920 die gemessene Zielbreite und kein kopierter
 * `ImageManipulator`-Aufruf. Schmalere Bilder werden nicht hochskaliert.
 */
export const ORDER_IMAGE_TARGET_WIDTH = 1920;

/**
 * `storage.buckets.file_size_limit` von `order-images`, gemessen 2026-10-08.
 * `allowed_mime_types` ist ausschließlich `image/jpeg`.
 */
export const ORDER_IMAGE_MAX_BYTES = 5_242_880;

const JPEG_QUALITIES = [0.85, 0.75, 0.6, 0.45] as const;

export type PreparedOrderImage = {
  blob: Blob;
  width: number;
  height: number;
  takenAt: string;
};

export type OrderImagePrepareCode = 'UNSUPPORTED_IMAGE' | 'IMAGE_UNREADABLE' | 'IMAGE_TOO_LARGE';

export class OrderImagePrepareError extends Error {
  readonly code: OrderImagePrepareCode;

  constructor(code: OrderImagePrepareCode) {
    super(code);
    this.name = 'OrderImagePrepareError';
    this.code = code;
  }
}

type ImageKind = 'jpeg' | 'png' | 'webp' | 'heic';

/**
 * Datei in das JPEG bringen, das der Bucket und die Handy-App erwarten.
 *
 * Maße sind die des gespeicherten JPEG nach EXIF-Drehung und Verkleinern,
 * nicht die der Originaldatei. `taken_at` kommt aus EXIF, sonst aus der
 * Dateizeit, sonst aus jetzt.
 */
export async function prepareOrderImage(file: File): Promise<PreparedOrderImage> {
  if (!recognizedKind(file)) throw new OrderImagePrepareError('UNSUPPORTED_IMAGE');

  const takenAt = (await readTakenAt(file)) ?? fallbackTakenAt(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new OrderImagePrepareError('IMAGE_UNREADABLE');
  }

  try {
    if (bitmap.width < 1 || bitmap.height < 1) {
      throw new OrderImagePrepareError('IMAGE_UNREADABLE');
    }
    const fitted = fitWidth(bitmap.width, bitmap.height);
    const encoded = await encodeUnderLimit(bitmap, fitted.width, fitted.height);
    return { ...encoded, takenAt };
  } finally {
    bitmap.close();
  }
}

function recognizedKind(file: File): ImageKind | null {
  const type = file.type.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/pjpeg') return 'jpeg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence'
  ) {
    return 'heic';
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (extension === 'jpg' || extension === 'jpeg') return 'jpeg';
  if (extension === 'png') return 'png';
  if (extension === 'webp') return 'webp';
  if (extension === 'heic' || extension === 'heif') return 'heic';
  return null;
}

async function readTakenAt(file: File): Promise<string | null> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return takenAtFromJpegBytes(bytes);
  } catch {
    return null;
  }
}

function fallbackTakenAt(file: File): string {
  if (Number.isFinite(file.lastModified) && file.lastModified > 0) {
    return new Date(file.lastModified).toISOString();
  }
  return new Date().toISOString();
}

function fitWidth(width: number, height: number): { width: number; height: number } {
  if (width <= ORDER_IMAGE_TARGET_WIDTH) return { width, height };
  return {
    width: ORDER_IMAGE_TARGET_WIDTH,
    height: Math.max(1, Math.round((height * ORDER_IMAGE_TARGET_WIDTH) / width)),
  };
}

async function encodeUnderLimit(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  let targetWidth = width;
  let targetHeight = height;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    for (const quality of JPEG_QUALITIES) {
      const blob = await renderJpeg(bitmap, targetWidth, targetHeight, quality);
      if (blob.size > 0 && blob.size <= ORDER_IMAGE_MAX_BYTES) {
        return { blob, width: targetWidth, height: targetHeight };
      }
    }
    targetWidth = Math.max(1, Math.round(targetWidth * 0.75));
    targetHeight = Math.max(1, Math.round(targetHeight * 0.75));
  }

  throw new OrderImagePrepareError('IMAGE_TOO_LARGE');
}

async function renderJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new OrderImagePrepareError('IMAGE_UNREADABLE');
  // JPEG kennt kein Alpha. Ohne Matte würde ein transparentes PNG schwarz.
  // Das Weiß landet in der Datei, es ist keine Oberflächenfarbe.
  context.fillStyle = 'rgb(255, 255, 255)';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
  if (!blob) throw new OrderImagePrepareError('IMAGE_UNREADABLE');
  return blob;
}
