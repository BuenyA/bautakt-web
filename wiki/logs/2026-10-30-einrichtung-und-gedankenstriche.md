# 2026-10-30: Einrichtung statt Übersicht, keine Gedankenstriche

**Anlass:** Owner-Rückmeldung zum neuen Bereich Unternehmen.

- Die Übersicht unter `/unternehmen` heißt jetzt **Einrichtung**
  (`/unternehmen/einrichtung`). Sie zeigt nur noch den Einrichtungsstand und
  verschwindet, sobald Anschrift, Steuernummer, Pflichtangaben und Bank
  eingetragen sind. Das Logo zählt als optional nicht mit. Die Kacheln zu
  allen Abschnitten sind entfallen.
- `/unternehmen` leitet auf den ersten sichtbaren Abschnitt, schmal zeigt es
  die Liste. `SubNavLayout` kennt keine eigene Startseite mehr (`indexPage`
  entfällt, neu `ready`).
- **Keine Gedankenstriche** in sichtbaren Texten der Web-App und der
  Marketingseite. Satzstriche sind umformuliert, Zeiträume lauten „bis“.
  Regel in `AGENTS.md`. Ausnahmen: „—“ als Platzhalter für leere Werte und
  kurze Uhrzeitspannen wie „08:00–16:00“.
- **Nicht angefasst:** die Hinweise des Renderers (`packages/document-render`),
  denn das Paket ist eine wörtliche Kopie aus `bautakt-app`. Sie dort zu
  ändern ist ein eigener Schritt in der App. Ebenso die App selbst.

Details: [unternehmen-und-profil.md](../pages/unternehmen-und-profil.md).
