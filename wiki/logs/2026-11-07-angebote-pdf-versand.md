# Angebote 1d: PDF und Versand im Web

2026-11-07, bautakt-app#183 (https://github.com/BuenyA/bautakt-app/issues/183)

## Was sich geändert hat

- Detailseite: „PDF“ für festgeschriebene Versionen, „Vorschau des Entwurfs“ für Entwürfe,
  „Per E-Mail versenden“ mit dem gemeinsamen Versanddialog. Der Editor stößt nach dem
  Festschreiben das Original an.
- Versanddialog mit optionalem Kanal, damit Rechnung und Angebot denselben Dialog nutzen.
- Render-Kern für Angebote per sync aus der App, 36 Golden-Fälle identisch zum Server.

## Warum so

- Ein Original je Version, weil der Kunde genau dieses Dokument erhält. Die Vorschau eines
  Entwurfs darf nie wie ein Original aussehen und wird deshalb nicht gespeichert.
- Kein zweiter Versanddialog: zwei Kopien laufen bei Pflichtangaben und Probelauf auseinander.

## Prüfung

- Production, Testbetrieb, erfundener Kunde: Vorschau schreibt nichts, zwei gleichzeitige
  Archiv-Aufrufe ergeben ein Original, SHA-256 der Datei gleich `content_hash`, Versand nur
  als Vorschau im Modus `allowlist`.
- Lokal (Schema von Production, erfundener Betrieb, Functions per Deno): Vorschau-Tab und
  PDF-Tab liefern ein PDF, Versand im Probelauf erscheint im Verlauf.

## Stolperstein beim Test

- Headless-Chromium zeigt PDFs nicht an, sondern lädt sie herunter. Der Tab bleibt auf
  `about:blank`. Prüfen über das `download`-Ereignis, nicht über die URL.
- Ohne Rechtsform, Registergericht, Registernummer und Geschäftsführer sperrt der
  Versanddialog „Jetzt senden“. Das ist gewollt (Pflichtangaben im Geschäftsbrief).
