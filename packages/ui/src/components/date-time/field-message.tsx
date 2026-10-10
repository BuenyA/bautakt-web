/**
 * Meldung unter einem Datums- oder Zeitfeld. `role="alert"`, damit ein
 * Screenreader sie beim Erscheinen vorliest; die Farbe ist Fluents Fehlertext.
 */
export function FieldMessage({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}
