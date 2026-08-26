export type Plan = {
  slug: string;
  name: string;
  price: string;
  interval: string;
  description: string;
  features: string[];
  featured?: boolean;
};

/** TODO: Preise noch nicht final — mit dem Vertrieb abstimmen, bevor die Seite live geht. */
export const plans: Plan[] = [
  {
    slug: 'basis',
    name: 'Basis',
    price: 'auf Anfrage',
    interval: 'pro Nutzer und Monat',
    description: 'Für kleine Betriebe, die Aufträge und Zeiten sauber erfassen wollen.',
    features: ['Aufträge und Kunden', 'Zeiterfassung', 'Material und Fotos', 'Mobile App'],
  },
  {
    slug: 'profi',
    name: 'Profi',
    price: 'auf Anfrage',
    interval: 'pro Nutzer und Monat',
    description: 'Für Betriebe, die auch abrechnen und planen.',
    features: [
      'Alles aus Basis',
      'Angebote und Rechnungen',
      'Mahnwesen',
      'Einsatzplanung',
      'Rollen und Rechte',
    ],
    featured: true,
  },
  {
    slug: 'betrieb',
    name: 'Betrieb',
    price: 'auf Anfrage',
    interval: 'individuell',
    description: 'Für größere Betriebe mit eigenen Anforderungen.',
    features: [
      'Alles aus Profi',
      'Auswertungen',
      'Individuelle Einrichtung',
      'Persönlicher Ansprechpartner',
    ],
  },
];
