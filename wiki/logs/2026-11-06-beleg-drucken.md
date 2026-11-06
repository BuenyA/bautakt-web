# 2026-11-06 — Drucken öffnet das angezeigte Beleg-PDF

„Drucken“ lag im Download-Menü der Belegseite und öffnete die HTML-Seite
`InvoicePrintPage` (Tabelle), nicht das Archiv-PDF. Wer das Original drucken
wollte, musste es zuerst herunterladen.

## Was geändert wurde

- Sichtbare Schaltfläche **Drucken** in der Kopfzeile. Festgeschriebene Belege
  drucken die Archiv-Bytes, die der Viewer schon geladen hat. Entwürfe drucken
  die PDF-Vorschau, im Editor die Live-Vorschau.
- Fehlt das PDF, bleibt die HTML-Druckansicht, beschriftet mit
  „Druckansicht (ohne PDF)“.
- Kein Schema, keine RLS, kein Finalize, keine Edge Function.

## Verweise

- [rechnungsbereich.md](../pages/rechnungsbereich.md)
- Issue #307
