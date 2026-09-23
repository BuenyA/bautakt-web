/**
 * CSV-Ausgabe fuer die Buchhaltung.
 *
 * Bewusst mit Semikolon, CRLF und BOM: Excel in deutscher Einstellung liest
 * Komma-CSV sonst in eine einzige Spalte, und ohne BOM werden Umlaute zu
 * Kraehenfuessen. Das ist kein Schoenheitsfehler — eine Datei, die sich beim
 * Doppelklick falsch oeffnet, gilt als kaputt.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(escapeCell).join(';')).join('\r\n');
}

function escapeCell(value: string): string {
  const text = value ?? '';
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Loest im Browser den Download aus; ohne Umweg ueber einen Server. */
export function downloadCsv(fileName: string, rows: readonly (readonly string[])[]): void {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
