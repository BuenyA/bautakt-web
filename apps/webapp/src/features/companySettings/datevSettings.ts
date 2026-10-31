/**
 * Regeln der DATEV-Einstellungen (#167), ohne React, damit sie testbar sind.
 *
 * Die Datenbank prüft dieselben Grenzen per CHECK (bautakt-app
 * 20261019201520_b_datev_settings). Hier stehen sie, damit der Fehler am Feld
 * erscheint statt als Datenbankmeldung.
 */

export const CHARTS = ['SKR03', 'SKR04'] as const;
export type Chart = (typeof CHARTS)[number];

export const ACCOUNT_LENGTHS = [4, 5, 6, 7, 8] as const;

/**
 * Wann erhaltenes Skonto im Export gebucht wird (#172): am Tag des Vermerks
 * oder am Tag der Zahlung. Wie der CHECK an
 * `company_datev_settings.cash_discount_booking`.
 */
export const CASH_DISCOUNT_BOOKINGS = ['on_note', 'on_payment'] as const;
export type CashDiscountBooking = (typeof CASH_DISCOUNT_BOOKINGS)[number];

/** Mit dieser Sachkontenlänge gelten die hinterlegten Standardkonten. */
export const STANDARD_ACCOUNT_LENGTH = 4;

export type Purpose =
  | 'revenue'
  | 'revenue_cash_discount'
  | 'expense'
  | 'expense_cash_discount'
  | 'collective_debtor'
  | 'collective_creditor';

/** Reihenfolge der Zwecke auf der Seite: erst Ausgang, dann Eingang, dann Personenkonten. */
export const PURPOSE_ORDER: readonly Purpose[] = [
  'revenue',
  'revenue_cash_discount',
  'expense',
  'expense_cash_discount',
  'collective_debtor',
  'collective_creditor',
];

const TAX_MODE_ORDER = ['standard', 'reverse_charge', 'tax_free', 'small_business', ''];

/** Ein Konto-Schlüssel: Zweck, Steuerart ('' = alle) und Satz (null = jeder). */
export type AccountSlot = {
  purpose: string;
  tax_mode: string;
  tax_rate: number | null;
};

export const slotKey = (slot: AccountSlot) =>
  `${slot.purpose}|${slot.tax_mode}|${slot.tax_rate ?? ''}`;

/** Sortiert Zeilen nach Zweck, Steuerart und absteigendem Satz (19 % vor 7 %). */
export function compareSlots(a: AccountSlot, b: AccountSlot): number {
  const rank = (list: readonly string[], value: string) => {
    const index = list.indexOf(value);
    return index === -1 ? list.length : index;
  };
  return (
    rank(PURPOSE_ORDER, a.purpose) - rank(PURPOSE_ORDER, b.purpose) ||
    rank(TAX_MODE_ORDER, a.tax_mode) - rank(TAX_MODE_ORDER, b.tax_mode) ||
    (b.tax_rate ?? -1) - (a.tax_rate ?? -1)
  );
}

/** Sammel-Debitor und -Kreditor sind Personenkonten: eine Stelle länger als Sachkonten. */
export const isPersonalAccount = (purpose: string) =>
  purpose === 'collective_debtor' || purpose === 'collective_creditor';

export const expectedAccountDigits = (purpose: string, accountLength: number) =>
  isPersonalAccount(purpose) ? accountLength + 1 : accountLength;

export type AccountError =
  | { kind: 'digits'; count: number }
  | { kind: 'debtorRange'; from: string; to: string }
  | { kind: 'creditorRange'; from: string; to: string };

/**
 * Prüft ein Konto gegen die Sachkontenlänge. Personenkonten müssen außerdem im
 * Bereich liegen, den DATEV für Debitoren (1…–6…) und Kreditoren (7…–9…)
 * vorsieht.
 */
export function accountError(
  purpose: string,
  account: string,
  accountLength: number,
): AccountError | null {
  const digits = expectedAccountDigits(purpose, accountLength);
  if (!new RegExp(`^[0-9]{${digits}}$`).test(account)) return { kind: 'digits', count: digits };

  const rest = '0'.repeat(digits - 1);
  const top = '9'.repeat(digits - 1);
  if (purpose === 'collective_debtor' && !/^[1-6]/.test(account)) {
    return { kind: 'debtorRange', from: `1${rest}`, to: `6${top}` };
  }
  if (purpose === 'collective_creditor' && !/^[7-9]/.test(account)) {
    return { kind: 'creditorRange', from: `7${rest}`, to: `9${top}` };
  }
  return null;
}

/** Steuerschlüssel: leer (Automatikkonto) oder bis zu vier Ziffern. */
export const isValidTaxKey = (taxKey: string) => /^[0-9]{0,4}$/.test(taxKey);

/** Beraternummer laut DATEV 1001 bis 9999999, leer erlaubt. */
export const isValidConsultantNumber = (value: string) =>
  value === '' || (/^[0-9]+$/.test(value) && Number(value) >= 1001 && Number(value) <= 9999999);

/** Mandantennummer 1 bis 99999, leer erlaubt. */
export const isValidClientNumber = (value: string) =>
  value === '' || (/^[0-9]+$/.test(value) && Number(value) >= 1 && Number(value) <= 99999);

/** Leere Eingabe → null, sonst die Zahl. Nur nach erfolgreicher Prüfung aufrufen. */
export const toOptionalNumber = (value: string) => (value.trim() === '' ? null : Number(value));
