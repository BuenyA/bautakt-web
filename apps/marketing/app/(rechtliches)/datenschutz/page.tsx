import type { Metadata } from 'next';

import { TodoHinweis } from '../_TodoHinweis';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Informationen zur Verarbeitung personenbezogener Daten nach Art. 13 DSGVO.',
  alternates: { canonical: '/datenschutz' },
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>
      <TodoHinweis was="Die Informationspflichten nach Art. 13 DSGVO müssen vollständig ausformuliert werden; die Abschnitte hier sind nur das Gerüst." />

      <h2>Verantwortlicher</h2>
      <p>Name und Kontaktdaten des Verantwortlichen.</p>

      <h2>Verarbeitete Daten und Zwecke</h2>
      <p>Welche Daten zu welchem Zweck und auf welcher Rechtsgrundlage verarbeitet werden.</p>

      <h2>Hosting und Auftragsverarbeiter</h2>
      <p>Eingesetzte Dienstleister und Serverstandort.</p>

      <h2>Speicherdauer</h2>
      <p>Wie lange Daten aufbewahrt werden.</p>

      <h2>Ihre Rechte</h2>
      <ul>
        <li>Auskunft (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Derzeit werden keine Analyse- oder Marketing-Cookies eingesetzt. Kommt das hinzu, sind
        Einwilligung und Cookie-Banner erforderlich.
      </p>
    </>
  );
}
