import { contactDisplayName } from '../contacts/contactModel.ts';

/** Status aus der Sicht `quote_overview`. Der Server rechnet ihn, die Web-App zeigt ihn nur. */
export const QUOTE_STATUSES = [
  'draft',
  'open',
  'expired',
  'accepted',
  'declined',
  'withdrawn',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type QuoteStatusFilter = 'all' | QuoteStatus;

export const QUOTE_KINDS = ['main', 'addendum'] as const;
export type QuoteKind = (typeof QUOTE_KINDS)[number];
export type QuoteKindFilter = 'all' | QuoteKind;

const STATUS_SLUG: Record<QuoteStatus, string> = {
  draft: 'entwurf',
  open: 'offen',
  expired: 'abgelaufen',
  accepted: 'angenommen',
  declined: 'abgelehnt',
  withdrawn: 'zurueckgezogen',
};

const KIND_SLUG: Record<QuoteKind, string> = {
  main: 'hauptangebot',
  addendum: 'nachtrag',
};

function fromSlug<T extends string>(slugs: Record<T, string>, value: string | null): 'all' | T {
  const hit = (Object.keys(slugs) as T[]).find((key) => slugs[key] === value);
  return hit ?? 'all';
}

export const quoteStatusFromSearch = (value: string | null): QuoteStatusFilter =>
  fromSlug(STATUS_SLUG, value);
export const quoteKindFromSearch = (value: string | null): QuoteKindFilter =>
  fromSlug(KIND_SLUG, value);
export const quoteStatusToSearch = (filter: QuoteStatusFilter): string | null =>
  filter === 'all' ? null : STATUS_SLUG[filter];
export const quoteKindToSearch = (filter: QuoteKindFilter): string | null =>
  filter === 'all' ? null : KIND_SLUG[filter];

export type QuoteFilterFields = { status: string | null; kind: string | null };

export function matchesQuoteFilter(
  row: QuoteFilterFields,
  status: QuoteStatusFilter,
  kind: QuoteKindFilter,
): boolean {
  return (status === 'all' || row.status === status) && (kind === 'all' || row.kind === kind);
}

export type QuoteFigureFields = {
  status: string | null;
  net_total: number | null;
  currency: string | null;
  follow_up_on: string | null;
};

export type QuoteFigures = {
  openCount: number;
  openNetMinor: number;
  acceptedCount: number;
  acceptedNetMinor: number;
  expiredCount: number;
  followUpDueCount: number;
  /** Beträge in CHF stecken in den Stückzahlen, aber nicht in den Euro-Summen. */
  hasOtherCurrency: boolean;
};

const toMinor = (value: number | null) => Math.round((value ?? 0) * 100);

/**
 * Kennzahlen über der Liste. Summen sind netto und nur in Euro: Euro und Franken
 * zusammenzuzählen ergäbe eine Zahl, die es nicht gibt.
 */
export function quoteFigures(rows: readonly QuoteFigureFields[], today: string): QuoteFigures {
  const figures: QuoteFigures = {
    openCount: 0,
    openNetMinor: 0,
    acceptedCount: 0,
    acceptedNetMinor: 0,
    expiredCount: 0,
    followUpDueCount: 0,
    hasOtherCurrency: false,
  };

  for (const row of rows) {
    const inEuro = row.currency === null || row.currency === 'EUR';
    const undecided = row.status === 'open' || row.status === 'expired';
    if (!inEuro && (row.status === 'open' || row.status === 'accepted')) {
      figures.hasOtherCurrency = true;
    }
    if (row.status === 'open') {
      figures.openCount += 1;
      if (inEuro) figures.openNetMinor += toMinor(row.net_total);
    }
    if (row.status === 'accepted') {
      figures.acceptedCount += 1;
      if (inEuro) figures.acceptedNetMinor += toMinor(row.net_total);
    }
    if (row.status === 'expired') figures.expiredCount += 1;
    if (undecided && row.follow_up_on !== null && row.follow_up_on <= today) {
      figures.followUpDueCount += 1;
    }
  }

  return figures;
}

/** Heutiges Datum in Berliner Zeit, derselbe Stichtag wie der Status in `quote_overview`. */
export function berlinToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export type QuoteCustomerFields = {
  customer: {
    contact: {
      kind: string;
      company_name: string;
      first_name: string;
      last_name: string;
    } | null;
  } | null;
};

export const QUOTE_CUSTOMER_SELECT =
  'customer:customer_profiles(contact:contacts(kind, company_name, first_name, last_name))';

export function quoteCustomerLabel(row: QuoteCustomerFields | undefined): string {
  const contact = row?.customer?.contact;
  return contact ? contactDisplayName(contact) : '';
}
