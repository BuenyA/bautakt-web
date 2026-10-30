# 2026-10-30 — Auftragsliste: Statusfilter statt Angebote-Tab

Die Auftragsliste schaltete zwischen Aufträge und Angebote und gliederte die
Tabelle in Abschnitte („Laufende Aufträge“, „Abgeschlossen“, „Angebote“,
„Abgelehnt“). Angebote als Auftragsstatus waren falsch modelliert; der
Wunsch war, oben nach Status zu wählen statt Abschnitte in der Tabelle zu
lesen.

## Was geändert wurde

- Tabs Alle · Laufend · Abgeschlossen, Default Laufend ohne Param;
  `?status=alle|abgeschlossen` (`orderList.ts`).
- Angebote-Tab, Abschnittsüberschriften und die Angebote-Leerzustände sind
  weg. `?status=quote` landet auf Laufend.
- Zeilen mit `quote`/`declined` stehen nur noch unter Alle. Am Schema hat
  sich nichts geändert.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md#auftragsliste)
- [Aufträge und Zeiten filtern wie in der App](./2026-10-05-auftraege-zeiten-listenfilter.md)
