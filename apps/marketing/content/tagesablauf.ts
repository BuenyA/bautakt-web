export type TagesablaufStep = {
  title: string;
  text: string;
};

export const tagesablauf = {
  eyebrow: 'Im Takt',
  title: 'So läuft der Tag mit Bautakt',
  intro: 'Von der Anfrage bis zur bezahlten Rechnung. Ein System für Baustelle und Büro.',
  steps: [
    {
      title: 'Auftrag annehmen',
      text: 'Kunde, Termin und Notizen an einer Stelle.',
    },
    {
      title: 'Team einplanen',
      text: 'Wer wann wohin. Klar für alle.',
    },
    {
      title: 'Auf der Baustelle arbeiten',
      text: 'Zeiten, Material und Fotos auch ohne Empfang.',
    },
    {
      title: 'Angebot und Rechnung',
      text: 'Aus dem Auftrag, ohne Abtippen.',
    },
    {
      title: 'Überblick behalten',
      text: 'Was offen ist, was bezahlt ist.',
    },
  ] satisfies TagesablaufStep[],
} as const;
