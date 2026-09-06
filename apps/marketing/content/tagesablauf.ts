export type TagesablaufStep = {
  /** Vollständiger Schritttext laut Spec, inkl. Punkte. */
  text: string;
};

export const tagesablauf = {
  eyebrow: 'Im Takt',
  title: 'So läuft der Tag mit Bautakt',
  intro: 'Von der Anfrage bis zur bezahlten Rechnung. Ein System für Baustelle und Büro.',
  steps: [
    { text: 'Auftrag annehmen. Kunde, Termin und Notizen an einer Stelle.' },
    { text: 'Team einplanen. Wer wann wohin. Klar für alle.' },
    { text: 'Auf der Baustelle arbeiten. Zeiten, Material und Fotos auch ohne Empfang.' },
    { text: 'Angebot und Rechnung. Aus dem Auftrag, ohne Abtippen.' },
    { text: 'Überblick behalten. Was offen ist, was bezahlt ist.' },
  ] satisfies TagesablaufStep[],
} as const;
