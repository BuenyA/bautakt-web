# Rechtstexte der Web-App

Impressum und Datenschutzerklärung stehen nur in den beiden Markdown-Dateien
dieses Ordners. Die Seiten lesen sie beim Build. Einen Text ersetzen heißt:
die Datei austauschen, sonst nichts anfassen.

`{{TELEFON}}` bleibt im Quelltext genau so stehen. Die Seite zeigt das
Zeichen als Hinweis-Badge, bis die Nummer eingesetzt ist. Es gibt keine
Ersetzung durch einen Wert.

Einfache Zeilenumbrüche (Firma, Straße, PLZ und Ort, „Vertreten durch“,
E-Mail) bleiben sichtbar. Dafür sorgt `remark-breaks` in
`MarkdownDocument.tsx`. Keine Leerzeile in den Adressblock setzen, sonst
werden es getrennte Absätze.

Die Anschrift steht nur in `impressum.md` und `datenschutz.md`.
