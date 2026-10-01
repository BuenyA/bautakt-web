# 2026-10-01 — Meta-Detailflächen Kunde und Einsatz

Auftrag- und Rechnung-Detail standen nach Slice 2 auf `gap-8`, mit
Beschreibung in `text-muted-foreground`. Kunde (`/kunden/:id`) und Einsatz
(`/einsaetze/:id`) lagen noch auf `gap-6`. Die Einsatz-Notiz über der Karte
nutzte `text-text-secondary`.

## Was geändert wurde

Nur Klassen. Kein Sheet, keine Felder, keine Listen, kein Router, keine
Sidebar, kein Token-Rewrite.

- `CustomerDetailPage` und `AssignmentDetailPage`: Wurzel `gap-8` in allen
  Zuständen (Laden, Fehler, Nicht-gefunden, Inhalt).
- Einsatz-Notiz-Lead: `max-w-3xl text-sm text-muted-foreground whitespace-pre-wrap`.
  Die Notiz-Zeile in der `DetailCard` bleibt.
- Der Auftrags-Link über der Einsatz-Karte bleibt
  `text-sm font-medium text-primary`.
- `DetailRow` hatte `whitespace-pre-wrap` auf dem Wert schon aus Slice 2.
  Adresse und Notizen des Kunden umbrechen darüber; die API der Zeile bleibt.

`DetailCard` (`max-w-3xl`) und das Kunden-Sheet bleiben unangetastet.
Einstellungen bleibt bei `gap-6`.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- [Meta-Detailflächen Auftrag und Rechnung](2026-10-01-meta-detail-surfaces.md)
