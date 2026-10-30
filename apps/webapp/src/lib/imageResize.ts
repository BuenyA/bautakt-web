/**
 * Bild im Browser verkleinern und als JPEG ausgeben — wie `expo-image-manipulator`
 * in der App (Profilbild 400 px / 0,75, Logo 512 px / 0,8).
 *
 * Transparente Flächen (PNG-Logos) werden weiß, nicht schwarz: JPEG kennt
 * keinen Alphakanal, und Rechnungen liegen auf Weiß.
 */
export class ImageResizeError extends Error {
  readonly code: 'UNSUPPORTED_IMAGE' | 'IMAGE_UNREADABLE';

  constructor(code: 'UNSUPPORTED_IMAGE' | 'IMAGE_UNREADABLE') {
    super(code);
    this.code = code;
  }
}

const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function resizeImageToJpeg(
  file: File,
  maxDimension: number,
  quality: number,
): Promise<Blob> {
  if (!SUPPORTED.includes(file.type)) throw new ImageResizeError('UNSUPPORTED_IMAGE');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageResizeError('IMAGE_UNREADABLE');
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new ImageResizeError('IMAGE_UNREADABLE');
  context.fillStyle = 'white';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new ImageResizeError('IMAGE_UNREADABLE');
  return blob;
}
