/**
 * Prüfregeln für die Firmenstammdaten — dieselben wie in der App
 * (`bautakt-app: app/lib/utils/validationUtils.ts`, `companyLegalSettings.ts`).
 * Wer hier etwas ändert, ändert es dort mit; sonst speichert das Web, was die
 * App als Fehler markiert, oder umgekehrt. Ausnahme: die Prüfziffern der
 * deutschen und österreichischen USt-IdNr. — die App rechnet sie falsch.
 *
 * Gespeichert wird das Land als ISO-Code (`DE`, `AT`, `CH`).
 */

export const COMPANY_COUNTRIES = ['DE', 'AT', 'CH'] as const;
export type CompanyCountry = (typeof COMPANY_COUNTRIES)[number];

export function toCompanyCountry(country: string | null | undefined): CompanyCountry {
  const key = (country ?? '').trim().toLowerCase();
  if (key === 'at' || key === 'österreich' || key === 'oesterreich') return 'AT';
  if (key === 'ch' || key === 'schweiz') return 'CH';
  return 'DE';
}

/** Gewerke zur Auswahl; ein eigener Wert ab zwei Zeichen geht auch. */
export const COMPANY_TYPES = [
  'Dachdecker',
  'Elektriker',
  'Estrichleger',
  'Fliesenleger',
  'Garten- und Landschaftsbau',
  'Gebäudereinigung',
  'Glaser',
  'Hochbau',
  'Maler und Lackierer',
  'Maurer',
  'Metallbau',
  'Sanitär, Heizung & Klima',
  'Stuckateur',
  'Tiefbau',
  'Tischler / Schreiner',
  'Zimmermann',
] as const;

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isValidPhone = (phone: string) => /^\d{6,15}$/.test(phone.replace(/[\s\-+()]/g, ''));

export function isValidPostalCode(postalCode: string, country: CompanyCountry): boolean {
  const trimmed = postalCode.trim();
  return country === 'DE' ? /^\d{5}$/.test(trimmed) : /^\d{4}$/.test(trimmed);
}

/**
 * Deutsche USt-IdNr.: ISO 7064 MOD 11,10 über die neun Ziffern.
 *
 * ⚠️ Bewusst anders als die App: Deren Gewichtung (8 … 2, mod 11) lehnt echte
 * Nummern wie DE136695976 ab und nimmt DE123456789 an.
 */
function deVatChecksum(digits: string): boolean {
  if (digits.length !== 9) return false;
  let product = 10;
  for (let i = 0; i < 8; i++) {
    const sum = (Number(digits[i]) + product) % 10 || 10;
    product = (2 * sum) % 11;
  }
  return (11 - product) % 10 === Number(digits[8]);
}

/**
 * Österreichische UID (ATU + 8 Ziffern): Quersummen mit Gewicht 1/2, dann
 * plus 4. Die App lässt die 4 weg und lehnt echte UIDs wie ATU13585627 ab.
 */
function atVatChecksum(digits: string): boolean {
  if (digits.length !== 8) return false;
  const weights = [1, 2, 1, 2, 1, 2, 1];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const product = Number(digits[i]) * weights[i]!;
    sum += Math.floor(product / 10) + (product % 10);
  }
  return (10 - ((sum + 4) % 10)) % 10 === Number(digits[7]);
}

function chUidChecksum(digits: string): boolean {
  if (digits.length !== 9) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4];
  const sum = weights.reduce((acc, weight, i) => acc + Number(digits[i]) * weight, 0);
  const remainder = sum % 11;
  if (remainder === 0) return Number(digits[8]) === 0;
  const check = 11 - remainder;
  return check !== 10 && check === Number(digits[8]);
}

export function isValidTaxNumber(taxNumber: string, country: CompanyCountry): boolean {
  const trimmed = taxNumber.trim();
  if (!trimmed) return false;
  if (country === 'DE') return [10, 11].includes(digitsOnly(trimmed).length);
  if (country === 'AT') return digitsOnly(trimmed).length === 9;
  const normalized = trimmed.toUpperCase().replace(/\s/g, '');
  const uid = digitsOnly(normalized.startsWith('CHE') ? normalized.slice(3) : normalized);
  if (uid.length === 9) return chUidChecksum(uid);
  return uid.length >= 9 && uid.length <= 12;
}

export function isValidVatId(vatId: string, country: CompanyCountry): boolean {
  const normalized = vatId
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');
  if (!normalized) return false;
  if (country === 'DE') return /^DE\d{9}$/.test(normalized) && deVatChecksum(normalized.slice(2));
  if (country === 'AT') return /^ATU\d{8}$/.test(normalized) && atVatChecksum(normalized.slice(3));
  const withoutSuffix = normalized.replace(/(MWST|TVA|IVA)$/, '');
  return /^CHE\d{9}$/.test(withoutSuffix) && chUidChecksum(withoutSuffix.slice(3));
}

/**
 * USt-IdNr. eines Kontakts: Das Präfix bestimmt das Land, nicht der Sitz —
 * ein Kunde in Deutschland kann eine ausländische Nummer haben. DE, AT und CH
 * mit Prüfziffer, andere EU-Länder nur nach Grundformat.
 */
export function isPlausibleVatId(vatId: string): boolean {
  const normalized = vatId
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');
  if (normalized.startsWith('DE')) return isValidVatId(normalized, 'DE');
  if (normalized.startsWith('AT')) return isValidVatId(normalized, 'AT');
  if (normalized.startsWith('CH')) return isValidVatId(normalized, 'CH');
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(normalized);
}

/** Leer ist erlaubt: nicht jeder Betrieb steht im Register. */
export function isValidTradeRegister(tradeRegister: string, country: CompanyCountry): boolean {
  const trimmed = tradeRegister.trim();
  if (!trimmed) return true;
  if (country === 'DE') return /\b(HRB|HRA|GNR|PR|VR)\s*\d+/i.test(trimmed);
  if (country === 'AT') return /\bFN\s*\d{5,}[a-z]?/i.test(trimmed);
  return /\bCHE?[-.]?\d{3}[.]?\d{3}[.]?\d{3}\b/i.test(trimmed);
}

const IBAN_LENGTHS: Record<CompanyCountry, number> = { DE: 22, AT: 20, CH: 21 };

export const normalizeIban = (iban: string) => iban.replace(/\s/g, '').toUpperCase();

/** IBAN in Viererblöcken, wie sie auf dem Beleg steht. */
export function formatIbanInput(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized.replace(/(.{4})(?=.)/g, '$1 ');
}

/** Die Firmen-IBAN muss zum Land des Betriebs passen (Präfix und Länge). */
export function isValidCompanyIban(iban: string, country: CompanyCountry): boolean {
  const normalized = normalizeIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized)) return false;
  if (!normalized.startsWith(country) || normalized.length !== IBAN_LENGTHS[country]) return false;
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = Number(String(remainder) + numeric.slice(i, i + 7)) % 97;
  }
  return remainder === 1;
}

/** Leer ist erlaubt; sonst Format und Länderkennung wie die IBAN. */
export function isValidBic(bic: string, country: CompanyCountry): boolean {
  const normalized = bic.trim().toUpperCase();
  if (!normalized) return true;
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized)) return false;
  return normalized.slice(4, 6) === country;
}

/** Beispielwerte je Land, als Platzhalter im Feld. */
export const PLACEHOLDERS: Record<
  CompanyCountry,
  { taxNumber: string; vatId: string; tradeRegister: string; iban: string }
> = {
  DE: {
    taxNumber: '12/345/67890',
    vatId: 'DE123456789',
    tradeRegister: 'HRB 12345',
    iban: 'DE89 3704 0044 0532 0130 00',
  },
  AT: {
    taxNumber: '12 345 6789',
    vatId: 'ATU12345678',
    tradeRegister: 'FN 123456a',
    iban: 'AT61 1904 3002 3457 3201',
  },
  CH: {
    taxNumber: 'CHE-123.456.789',
    vatId: 'CHE-123.456.789 MWST',
    tradeRegister: 'CHE-123.456.789',
    iban: 'CH93 0076 2011 6238 5295 7',
  },
};

/** Rechtsformen wie im CHECK von `companies.legal_form` (#186). */
export const LEGAL_FORMS = [
  'einzelunternehmen',
  'ek',
  'gbr',
  'ohg',
  'kg',
  'gmbh',
  'ug',
  'gmbh_co_kg',
  'ag',
  'eg',
  'other',
] as const;

/**
 * Eingetragen: Sitz, Registergericht und -nummer sind Pflicht im
 * Geschäftsbrief. Gleiche Regel wie `company_legal_footer_missing`.
 */
export function legalFormNeedsRegister(legalForm: string): boolean {
  return ['ek', 'ohg', 'kg', 'gmbh', 'ug', 'gmbh_co_kg', 'ag', 'eg'].includes(legalForm);
}

/** Kapitalgesellschaften: alle Geschäftsführer bzw. Vorstände (§ 35a GmbHG, § 80 AktG). */
export function legalFormNeedsDirectors(legalForm: string): boolean {
  return ['gmbh', 'ug', 'ag'].includes(legalForm);
}

/** Geschäftsführer stehen auch bei der GmbH & Co. KG im Feld, dort freiwillig. */
export function legalFormShowsDirectors(legalForm: string): boolean {
  return legalFormNeedsDirectors(legalForm) || legalForm === 'gmbh_co_kg';
}
