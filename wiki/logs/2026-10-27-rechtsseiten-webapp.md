# 2026-10-27 — Rechtsseiten in der Web-App

## Was geändert wurde

`/impressum` und `/datenschutz` liegen in `apps/webapp`, ohne Anmeldung und
auch mit Sitzung. Sie sind Geschwister der Auth-Guards, nicht deren Kinder
(`router.tsx`).

Der Wortlaut steht nur in `apps/webapp/src/content/legal/impressum.md` und
`datenschutz.md`. Gezeichnet wird er mit `react-markdown`, `remark-gfm` und
`remark-breaks` (`MarkdownDocument.tsx`): Tabellen, fette Stellen, Listen,
und ein einfacher Zeilenumbruch bleibt eine Zeile. `{{TELEFON}}` bleibt im
Quelltext und erscheint als Hinweis-Badge. https- und mailto-Links öffnen in
einem neuen Tab mit `rel="noopener noreferrer"`. Die Tabelle sitzt in
`overflow-x-auto`.

`legal.ts` verlinkt die beiden App-Routen. AGB hat `published: false` und
keinen Pfad, weil es in der Web-App keine Seite gibt. Login, Registrieren,
Passwort vergessen und Passwort zurücksetzen zeigen die Links im Fuß der
`AuthCard`. In der App: Persona öffnen, dann direkt Impressum oder
Datenschutz.

Die Marketing-App ist unverändert. `apps/webapp/vercel.json` hatte den
Catch-all schon.

Der Wortlaut der beiden Markdown-Dateien ist 1:1 der gelieferte Text.
`{{TELEFON}}` bleibt der offene Platzhalter im Impressum.

## Warum

Die bisherigen Links zeigten auf die Gerüste der Marketing-Seite. § 5 DDG
und Art. 13 DSGVO verlangen die Angaben ohne Anmeldung. Ein AGB-Link ohne
Seite wäre eine tote Adresse.

## Geprüft

Vitest rendert beide Seiten ohne Sitzung (kein Login-Text, Tabelle, Badge,
Zeilenumbruch, kein Auth-Guard). `npm run check` ist grün. Im Browser: Fuß
der Anmeldung, beide Seiten hell, Tabellenbereich, eine Seite dunkel. Die
Anmeldung bleibt dunkel, weil `AuthCard` das dunkle Theme erzwingt.
