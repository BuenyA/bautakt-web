/**
 * Pakete, Preise und Wortlaute der Seite /preise.
 *
 * Ein Betrag wird hier geändert, nicht in einer Komponente. Der Wortlaut des
 * Gründerprogramms ist vom Owner vorgegeben (2.11.2026). Recht prüft ihn noch.
 * Der Rabatt gilt auf Monats- und Jahrespreis, nicht auf Support Plus. Die
 * Seite rechnet keine Rabattpreise aus und zeigt keinen Zähler der Plätze.
 */

export type BillingPeriod = 'monthly' | 'yearly';

/** Vorauswahl des Umschalters. Steht schon im serverseitigen HTML. */
export const defaultBillingPeriod: BillingPeriod = 'yearly';

export const founderProgramText =
  'Der Listenpreis Ihres Tarifs bleibt 24 Monate unverändert. In den ersten 12 Monaten erhalten Sie darauf 40 % Gründerrabatt. Für die ersten 10 Betriebe, Einrichtung frei.' as const;

/** Betreff der mailto-Anfrage. Der Empfänger bleibt site.supportEmail. */
export const founderProgramMailtoSubject = 'Gründerprogramm' as const;

const mobileAppFeature = 'Mobile App enthalten, keine separate Mobil-Lizenz.';

export type StandardPlan = {
  id: 'start' | 'betrieb' | 'team';
  name: string;
  users: number;
  monthlyEuro: number;
  /** Monatspreis bei jährlicher Zahlung im Voraus. */
  yearlyMonthlyEuro: number;
  badge: string | null;
  features: readonly string[];
};

export type BusinessTier = {
  users: number;
  monthlyEuro: number;
};

export type BusinessPlan = {
  id: 'business';
  name: string;
  tiers: readonly BusinessTier[];
  features: readonly string[];
};

export const standardPlans: readonly StandardPlan[] = [
  {
    id: 'start',
    name: 'Start',
    users: 1,
    monthlyEuro: 19,
    yearlyMonthlyEuro: 15,
    badge: null,
    features: ['50 Rechnungen pro Monat', 'Starterpaket E-Rechnung', mobileAppFeature],
  },
  {
    id: 'betrieb',
    name: 'Betrieb',
    users: 5,
    monthlyEuro: 99,
    yearlyMonthlyEuro: 89,
    badge: 'Beliebt',
    features: [mobileAppFeature],
  },
  {
    id: 'team',
    name: 'Team',
    users: 15,
    monthlyEuro: 199,
    yearlyMonthlyEuro: 179,
    badge: null,
    features: [mobileAppFeature],
  },
];

export const businessPlan: BusinessPlan = {
  id: 'business',
  name: 'Business',
  tiers: [
    { users: 25, monthlyEuro: 299 },
    { users: 40, monthlyEuro: 399 },
    { users: 50, monthlyEuro: 499 },
  ],
  features: [mobileAppFeature],
};

export const addons = [
  { id: 'einrichtung', name: 'Einrichtung', amountEuro: 299, cadence: 'einmalig' },
  { id: 'support-plus', name: 'Support Plus', amountEuro: 39, cadence: 'pro Monat' },
] as const;

export const pricingCopy = {
  title: 'Preise',
  description: 'Vier Pakete mit festen Nutzerzahlen. Die mobile App ist in jedem Paket enthalten.',
  metaDescription:
    'Pakete und Preise für Bautakt. Start, Betrieb, Team und Business, monatlich oder jährlich.',
  founderTitle: 'Gründerprogramm',
  founderCta: 'Gründerprogramm anfragen',
  plansTitle: 'Pakete',
  billingLegend: 'Abrechnungszeitraum',
  monthlyLabel: 'Monatlich',
  yearlyLabel: 'Jährlich',
  contactCta: 'Kontakt aufnehmen',
  perMonth: 'pro Monat',
  yearlyDetail: 'pro Monat, jährlich abgerechnet',
  savingsSuffix: 'Ersparnis pro Jahr',
  licenseNote:
    'Feste Lizenzstufen, keine Einzellizenzen. Für mehr Nutzer wählen Sie das nächstgrößere Paket.',
  priceNote: 'Alle Preise netto, zzgl. 19 % MwSt. Das Angebot richtet sich an Unternehmen (B2B).',
  addonsTitle: 'Zusatzleistungen',
} as const;

/** Ganzzahliger Euro-Betrag, deutsches Tausendertrennzeichen, Leerzeichen vor €. */
export function formatEuro(amount: number): string {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(amount)} €`;
}

export function usersLabel(count: number): string {
  return `${count} Nutzer`;
}

/** Ersparnis der jährlichen Zahlung gegenüber zwölf Monatspreisen. */
export function yearlySavingsEuro(plan: StandardPlan): number {
  return (plan.monthlyEuro - plan.yearlyMonthlyEuro) * 12;
}

export function yearlyTotalEuro(plan: StandardPlan): number {
  return plan.yearlyMonthlyEuro * 12;
}

export type StandardPriceView = {
  amountEuro: number;
  /** Satz unter dem großen Betrag. */
  detail: string;
  /** Nur bei jährlicher Abrechnung, sonst null. */
  savings: string | null;
};

export function standardPriceView(plan: StandardPlan, period: BillingPeriod): StandardPriceView {
  if (period === 'yearly') {
    const total = formatEuro(yearlyTotalEuro(plan));
    return {
      amountEuro: plan.yearlyMonthlyEuro,
      detail: `${pricingCopy.yearlyDetail} (${total})`,
      savings: `${formatEuro(yearlySavingsEuro(plan))} ${pricingCopy.savingsSuffix}`,
    };
  }

  return {
    amountEuro: plan.monthlyEuro,
    detail: pricingCopy.perMonth,
    savings: null,
  };
}
