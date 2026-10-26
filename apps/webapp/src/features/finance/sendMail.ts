/**
 * Reine Hilfen für „Per E-Mail versenden“ (#186): Empfänger lesen, Anhang
 * benennen, Fußzeile für die Vorschau zerlegen. Ohne React und Supabase,
 * damit sie mit `node --test` laufen.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mehrere Empfänger durch Komma, Semikolon oder Leerzeichen getrennt. */
export function parseRecipients(input: string): { valid: string[]; invalid: string[] } {
  const parts = input
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const unique = [...new Set(parts.map((part) => part.toLowerCase()))];
  return {
    valid: unique.filter((part) => EMAIL.test(part)),
    invalid: unique.filter((part) => !EMAIL.test(part)),
  };
}

/**
 * Was der Kunde im Anhang bekommt: bei XRechnung das eingebettete XML
 * (öffentliche Auftraggeber verarbeiten nur das), sonst das Archiv-PDF.
 */
export function attachmentFileName(
  baseName: string,
  document: { e_invoice: boolean; einvoice_format: string },
): string {
  return document.e_invoice && document.einvoice_format === 'xrechnung'
    ? `${baseName}.xml`
    : `${baseName}.pdf`;
}

export type FooterDetails = {
  name: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  register_court: string | null;
  trade_register: string | null;
  managing_directors: string[];
  registered_office: string | null;
};

export type FooterSegment = { kind: 'text'; value: string } | { kind: 'missing'; field: string };

const has = (value: string | null | undefined) => Boolean(value?.trim());

/**
 * Fußzeile der Vorschau als Zeilen aus Abschnitten. Fehlende Pflichtangaben
 * (`missing` aus `company_legal_footer_missing`) erscheinen als eigener
 * Abschnitt, den die Oberfläche rot markiert. Die Rechtsform steht im
 * Firmennamen („… GmbH“); fehlt sie in den Einstellungen, zeigt die
 * Vorschau sie trotzdem als fehlend.
 *
 * Nur Vorschau: die gesendete Fußzeile erzeugt der Mail-Adapter.
 */
export function footerSegments(
  details: FooterDetails,
  missing: readonly string[],
  labels: { office: string; directors: string },
): FooterSegment[][] {
  const text = (value: string): FooterSegment => ({ kind: 'text', value });
  const gap = (field: string): FooterSegment => ({ kind: 'missing', field });
  const lacks = (field: string) => missing.includes(field);

  const first: FooterSegment[] = [has(details.name) ? text(details.name!.trim()) : gap('name')];
  if (has(details.street_address) && has(details.postal_code) && has(details.city)) {
    first.push(
      text(
        `${details.street_address!.trim()}, ${details.postal_code!.trim()} ${details.city!.trim()}`,
      ),
    );
  } else if (lacks('address')) {
    first.push(gap('address'));
  }

  const second: FooterSegment[] = [];
  if (lacks('legal_form')) second.push(gap('legal_form'));
  // Sitz nur bei eingetragenen Betrieben, also wenn Registerangaben da sind
  // oder fehlen.
  const registered =
    has(details.register_court) ||
    has(details.trade_register) ||
    ['registered_office', 'register_court', 'trade_register'].some(lacks);
  if (lacks('registered_office')) second.push(gap('registered_office'));
  else if (registered) {
    const office = has(details.registered_office) ? details.registered_office! : details.city!;
    second.push(text(`${labels.office}: ${office.trim()}`));
  }

  if (has(details.register_court) || has(details.trade_register)) {
    const register = [details.register_court?.trim(), details.trade_register?.trim()]
      .filter(Boolean)
      .join(', ');
    second.push(text(register));
  }
  if (lacks('register_court')) second.push(gap('register_court'));
  if (lacks('trade_register')) second.push(gap('trade_register'));

  const directors = details.managing_directors.map((name) => name.trim()).filter(Boolean);
  if (directors.length > 0) second.push(text(`${labels.directors}: ${directors.join(', ')}`));
  else if (lacks('managing_directors')) second.push(gap('managing_directors'));

  return second.length > 0 ? [first, second] : [first];
}
