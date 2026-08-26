export type FaqItem = { question: string; answer: string };

export const faq: FaqItem[] = [
  {
    question: 'Funktioniert Bautakt auch ohne Empfang?',
    answer:
      'Ja. Die mobile App erfasst Zeiten, Material und Fotos auch offline und überträgt sie, sobald wieder eine Verbindung besteht.',
  },
  {
    question: 'Brauchen alle Mitarbeiter einen Zugang?',
    answer:
      'Nein. Sie entscheiden pro Person, ob und mit welchen Rechten sie Zugriff bekommt. Zeiten können auch für das Team eingetragen werden.',
  },
  {
    question: 'Wo liegen unsere Daten?',
    answer: 'Auf Servern in der EU (Frankfurt). Details stehen in der Datenschutzerklärung.',
  },
  {
    question: 'Können wir Bautakt testen?',
    answer: 'Ja. Sie können ein Konto anlegen und den Betrieb unverbindlich einrichten.',
  },
];
