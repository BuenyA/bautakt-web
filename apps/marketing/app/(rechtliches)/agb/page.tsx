import type { Metadata } from 'next';

import { TodoHinweis } from '../_TodoHinweis';

export const metadata: Metadata = {
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen.',
  alternates: { canonical: '/agb' },
  robots: { index: false },
};

export default function AgbPage() {
  return (
    <>
      <h1>Allgemeine Geschäftsbedingungen</h1>
      <TodoHinweis was="AGB sind rechtsverbindlich und müssen anwaltlich erstellt oder geprüft werden." />

      <h2>1. Geltungsbereich</h2>
      <h2>2. Vertragsschluss</h2>
      <h2>3. Leistungsumfang</h2>
      <h2>4. Preise und Zahlung</h2>
      <h2>5. Laufzeit und Kündigung</h2>
      <h2>6. Pflichten des Kunden</h2>
      <h2>7. Verfügbarkeit</h2>
      <h2>8. Haftung</h2>
      <h2>9. Datenschutz</h2>
      <h2>10. Schlussbestimmungen</h2>
    </>
  );
}
