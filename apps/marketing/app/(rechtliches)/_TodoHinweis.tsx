/**
 * Sichtbarer Platzhalter fuer noch nicht geprueften Rechtstext.
 *
 * ⚠️ Impressum, Datenschutzerklaerung und AGB sind in Deutschland
 * rechtsverbindlich. Diese Seiten tragen bewusst nur Struktur und
 * Ueberschriften — kein generierter, plausibel klingender Rechtstext. Der
 * Inhalt kommt von der Geschaeftsfuehrung bzw. aus juristischer Pruefung.
 */
export function TodoHinweis({ was }: { was: string }) {
  return (
    <p
      role="note"
      className="mt-6 rounded-md border border-warning-border bg-warning-bg p-4 text-sm text-foreground"
    >
      <strong>TODO — juristisch prüfen.</strong> {was} Diese Seite ist ein Gerüst und darf so nicht
      veröffentlicht werden.
    </p>
  );
}
