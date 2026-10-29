# Rechtstexte der Web-App

Impressum und Datenschutzerklärung stehen nur in den beiden Markdown-Dateien
dieses Ordners. Die Seiten lesen sie beim Build. Einen Text ersetzen heißt:
die Datei austauschen, sonst nichts anfassen.

Die Telefonnummer steht im Impressum. Sie wird hier nicht wiederholt. Ein
`{{TELEFON}}` im Markdown würde die Seite weiterhin als Hinweis-Badge zeigen.

Einfache Zeilenumbrüche (Firma, Straße, PLZ und Ort, „Vertreten durch“,
E-Mail) bleiben sichtbar. Dafür sorgt `remark-breaks` in
`MarkdownDocument.tsx`. Keine Leerzeile in den Adressblock setzen, sonst
werden es getrennte Absätze.

Die Anschrift steht nur in `impressum.md` und `datenschutz.md`.
