import type { Metadata } from 'next';

import { TodoHinweis } from '../_TodoHinweis';

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Anbieterkennzeichnung nach § 5 DDG.',
  alternates: { canonical: '/impressum' },
  robots: { index: false },
};

export default function ImpressumPage() {
  return (
    <>
      <h1>Impressum</h1>
      <TodoHinweis was="Angaben nach § 5 DDG müssen vollständig und korrekt eingetragen werden." />

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>Firmenname, Rechtsform, Anschrift.</p>

      <h2>Vertreten durch</h2>
      <p>Geschäftsführung.</p>

      <h2>Kontakt</h2>
      <p>Telefon, E-Mail.</p>

      <h2>Registereintrag</h2>
      <p>Registergericht, Registernummer.</p>

      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      <p>USt-IdNr. gemäß § 27a UStG.</p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>Hinweis nach § 36 VSBG.</p>
    </>
  );
}
