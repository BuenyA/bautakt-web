/**
 * Warum das Archiv-Original nicht entstanden ist, in Klartext (#216).
 *
 * `finance-document-render` antwortet bei Fehlern mit `{ ok: false, error }`
 * und einem technischen englischen Text. Der Nutzer bekommt eine Einordnung
 * nach Status, die Meldung des Servers bleibt als technischer Zusatz dran:
 * Sie ist das, was im Support weiterhilft. Ohne Status kam keine Antwort an
 * (Netz, Funktion nicht erreichbar).
 */
export function archiveFailureReason(status: number | undefined, detail: string | null): string {
  const reason =
    status === undefined
      ? 'Der Server war nicht erreichbar. Bitte die Internetverbindung prüfen.'
      : status === 401
        ? 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.'
        : status === 403
          ? 'Dir fehlt die Berechtigung für Rechnungen.'
          : status === 404
            ? 'Der Beleg wurde nicht gefunden.'
            : 'Der Server konnte das PDF nicht erzeugen.';
  const technical = detail?.trim();
  return technical ? `${reason} Technische Meldung: ${technical}` : reason;
}

/** Fehlertext aus der Antwort der Edge Function, falls sie einen mitschickt. */
export async function readFunctionErrorDetail(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.clone().json();
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
    return null;
  } catch {
    return null;
  }
}
