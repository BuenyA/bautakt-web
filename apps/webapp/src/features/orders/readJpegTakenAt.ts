/**
 * Aufnahmezeit aus einem JPEG, soweit EXIF sie hergibt.
 *
 * Gesucht wird `DateTimeOriginal` (0x9003), sonst `DateTimeDigitized`
 * (0x9004), sonst `DateTime` (0x0132). `OffsetTimeOriginal` (0x9011) wird
 * mitgenommen, wenn es da ist. Ohne Offset gilt die Ortszeit des Browsers:
 * die Baustelle und der Schreibtisch liegen in derselben Zone.
 *
 * Kein Treffer, kein JPEG oder ein abgeschnittenes Segment ergibt `null`.
 * Der Aufrufer nimmt dann die Dateizeit oder jetzt. Der Parser wirft nicht.
 */

const DATE_PATTERN = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;
const OFFSET_PATTERN = /^([+-])(\d{2}):(\d{2})$/;

const TAG_DATE_TIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_DATE_TIME_DIGITIZED = 0x9004;
const TAG_OFFSET_TIME_ORIGINAL = 0x9011;

type ExifDates = {
  dateTime: string | null;
  original: string | null;
  digitized: string | null;
  offsetOriginal: string | null;
};

export function takenAtFromJpegBytes(bytes: Uint8Array): string | null {
  try {
    return readTakenAt(bytes);
  } catch {
    return null;
  }
}

function readTakenAt(bytes: Uint8Array): string | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset]!;
    offset += 1;
    // Standalone-Marker tragen keine Länge.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xd9) return null;
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (length < 2 || offset + length > bytes.length) return null;
    if (marker === 0xe1) {
      const taken = exifDateFromApp1(bytes.subarray(offset + 2, offset + length));
      if (taken) return taken;
    }
    // SOS: danach kommen die Bilddaten, kein weiteres EXIF.
    if (marker === 0xda) return null;
    offset += length;
  }
  return null;
}

function exifDateFromApp1(payload: Uint8Array): string | null {
  if (payload.length < 14) return null;
  if (
    payload[0] !== 0x45 ||
    payload[1] !== 0x78 ||
    payload[2] !== 0x69 ||
    payload[3] !== 0x66 ||
    payload[4] !== 0 ||
    payload[5] !== 0
  ) {
    return null;
  }
  return exifDateFromTiff(payload.subarray(6));
}

function exifDateFromTiff(tiff: Uint8Array): string | null {
  if (tiff.length < 8) return null;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const littleEndian = tiff[0] === 0x49 && tiff[1] === 0x49;
  const bigEndian = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!littleEndian && !bigEndian) return null;
  if (view.getUint16(2, littleEndian) !== 42) return null;

  const found: ExifDates = {
    dateTime: null,
    original: null,
    digitized: null,
    offsetOriginal: null,
  };
  readIfd(view, littleEndian, view.getUint32(4, littleEndian), tiff.length, found, true);

  const raw = found.original ?? found.digitized ?? found.dateTime;
  if (!raw) return null;
  return exifToIso(raw, found.original ? found.offsetOriginal : null);
}

function readIfd(
  view: DataView,
  littleEndian: boolean,
  ifdOffset: number,
  tiffLength: number,
  found: ExifDates,
  followExif: boolean,
): void {
  if (ifdOffset < 0 || ifdOffset + 2 > tiffLength) return;
  const count = view.getUint16(ifdOffset, littleEndian);
  if (count > 256) return;

  let exifPointer: number | null = null;
  for (let index = 0; index < count; index += 1) {
    const entry = ifdOffset + 2 + index * 12;
    if (entry + 12 > tiffLength) return;
    const tag = view.getUint16(entry, littleEndian);
    if (followExif && tag === TAG_EXIF_IFD) {
      exifPointer = readLong(view, littleEndian, entry);
      continue;
    }
    const text = readAscii(view, littleEndian, entry, tiffLength);
    if (!text) continue;
    if (tag === TAG_DATE_TIME) found.dateTime = text;
    if (tag === TAG_DATE_TIME_ORIGINAL) found.original = text;
    if (tag === TAG_DATE_TIME_DIGITIZED) found.digitized = text;
    if (tag === TAG_OFFSET_TIME_ORIGINAL) found.offsetOriginal = text;
  }

  if (followExif && exifPointer !== null) {
    readIfd(view, littleEndian, exifPointer, tiffLength, found, false);
  }
}

function readLong(view: DataView, littleEndian: boolean, entry: number): number | null {
  const type = view.getUint16(entry + 2, littleEndian);
  const count = view.getUint32(entry + 4, littleEndian);
  // LONG, genau ein Wert, passt in die vier Wert-Bytes.
  if (type !== 4 || count !== 1) return null;
  return view.getUint32(entry + 8, littleEndian);
}

function readAscii(
  view: DataView,
  littleEndian: boolean,
  entry: number,
  tiffLength: number,
): string | null {
  const type = view.getUint16(entry + 2, littleEndian);
  const count = view.getUint32(entry + 4, littleEndian);
  // ASCII. Länger als ein Datum plus Offset braucht es hier nicht.
  if (type !== 2 || count < 1 || count > 64) return null;

  let start: number;
  if (count <= 4) {
    start = entry + 8;
  } else {
    start = view.getUint32(entry + 8, littleEndian);
  }
  if (start < 0 || start + count > tiffLength) return null;

  const bytes = new Uint8Array(view.buffer, view.byteOffset + start, count);
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  if (end === 0) return null;

  let text = '';
  for (let index = 0; index < end; index += 1) {
    text += String.fromCharCode(bytes[index]!);
  }
  return text;
}

function exifToIso(raw: string, offset: string | null): string | null {
  const match = DATE_PATTERN.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (year < 1970 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 60) return null;

  const offsetMatch = offset ? OFFSET_PATTERN.exec(offset.trim()) : null;
  if (offsetMatch) {
    const parsed = new Date(
      `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${offsetMatch[0]}`,
    );
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  const local = new Date(year, month - 1, day, hour, minute, second);
  if (local.getFullYear() !== year || local.getMonth() !== month - 1 || local.getDate() !== day) {
    return null;
  }
  return local.toISOString();
}
