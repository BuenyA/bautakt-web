# 2026-10-30 — Auftrag: Übersicht mit Vorschau-Karten und Unterseiten

Die Auftragsseite war eine lange Spalte aus breiten, flachen Abschnitten. Der
Owner wollte Vorschauen und je Bereich eine eigene Adresse.

## Was geändert wurde

- `/auftraege/:id` ist die Übersicht: Stammdaten und Beteiligte, darunter je
  Bereich eine Vorschau-Karte mit „Alle anzeigen“ und Schnellaktion.
- Reiter Übersicht · Fotos · Notizen · Checkliste · Zeiten · Material ·
  Bautagebuch; jeder Bereich hat seine Route (`/auftraege/:id/fotos` …).
- Die Abschnitte öffnen mit `?neu=1` ihr Anlege-Panel.
- Der alte Link `/zeiten?order=` führt jetzt auf die Zeiten des Auftrags.
- Ohne Schema-Änderung.

Geprüft mit `npm run check` und im Browser gegen nachgebaute
Supabase-Antworten (Playwright): Übersicht voll und leer, Handy-Breite,
Reiterwechsel auf `/checkliste`, `/notizen?neu=1` öffnet das Panel. Nicht
geprüft: mit einem echten Konto gegen die Datenbank.

## Verweise

- [auftragsseite.md](../pages/auftragsseite.md)
