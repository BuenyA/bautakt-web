export type Feature = {
  slug: string;
  title: string;
  summary: string;
  details: string[];
};

export const features: Feature[] = [
  {
    slug: 'auftraege',
    title: 'Aufträge',
    summary: 'Jeder Auftrag mit Kunde, Team, Terminen und Dokumenten an einer Stelle.',
    details: [
      'Aufträge anlegen, zuweisen und abschließen',
      'Fotos, Dokumente und Notizen direkt am Auftrag',
      'Checklisten und Tagesberichte',
    ],
  },
  {
    slug: 'zeiterfassung',
    title: 'Zeiterfassung',
    summary: 'Zeiten werden dort erfasst, wo sie entstehen — auch ohne Empfang.',
    details: [
      'Erfassung pro Mitarbeiter und Auftrag',
      'Zeiten für das Team eintragen',
      'Grundlage für Lohnkosten und Abrechnung',
    ],
  },
  {
    slug: 'material',
    title: 'Material',
    summary: 'Verbrauchtes Material landet am Auftrag statt auf einem Zettel.',
    details: [
      'Katalog mit eigenen Artikeln',
      'Erfassung direkt auf der Baustelle',
      'Übernahme in die Rechnung',
    ],
  },
  {
    slug: 'finanzen',
    title: 'Angebote und Rechnungen',
    summary: 'Vom Angebot bis zum Zahlungseingang, ohne Medienbruch.',
    details: [
      'Angebote, Rechnungen und Abschläge',
      'Mahnwesen und Zahlungsabgleich',
      'Wiederkehrende Belege',
    ],
  },
  {
    slug: 'team',
    title: 'Team und Rollen',
    summary: 'Wer was sehen und tun darf, wird pro Rolle festgelegt.',
    details: [
      'Sieben Systemrollen plus eigene',
      'Rechte pro Rolle',
      'Abwesenheiten und Einsatzplanung',
    ],
  },
  {
    slug: 'kalender',
    title: 'Planung',
    summary: 'Einsätze, Termine und Abwesenheiten in einer Ansicht.',
    details: ['Einsatzplanung für das Team', 'Termine am Auftrag', 'Urlaub und Krankmeldungen'],
  },
];
