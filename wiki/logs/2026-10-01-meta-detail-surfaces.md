# 2026-10-01 — Meta-Detailflächen Auftrag und Rechnung

Slice 1 hat Buttons, Badges, Listen, Leerzustand und Seitenkopf weich gemacht.
Auftrag-Detail und Rechnung-Detail waren danach noch flach: Notiz-, Zeit- und
Fotokarten lagen auf `bg-surface` mit `rounded-lg`, Section-Titel auf
`text-base`, die Seitenwurzel auf `gap-6`.

## Was geändert wurde

Nur Klassen. Kein Upload, kein CRUD, keine neuen Texte, kein Router, keine
Sidebar, kein Token-Rewrite.

- Section Fotos, Notizen, Zeiten: `gap-4`, Titel `text-lg` und `tracking-tight`.
- Notiz- und Zeitkarte: `rounded-xl border border-border bg-card shadow-sm`,
  Hover `border-border-strong`. Skelette `rounded-xl`.
- Fotokachel: dieselbe Fläche plus `hover:shadow-md`. Bildunterschrift
  `px-2.5 py-2` auf `bg-card`. Lightbox `rounded-xl`. Spalten 2/3/4 bleiben.
- `OrderDetailPage` und `InvoiceDetailPage`: Wurzel `gap-8`. Auftragsbeschreibung
  `text-muted-foreground`.
- `DetailCard`: Titel explizit `tracking-tight`, Label-Spalte `10rem` statt
  `12rem`.
- Rechnungs-Blocker `rounded-xl`. Positions- und Zahlungstitel wie `DetailCard`.
  Zahlungszeilen leicht angehoben (`bg-surface/60`).

`DetailCard` nutzen auch Kunde, Einsatz und Einstellungen. Die engere
Label-Spalte und der Titel mit `tracking-tight` gelten dort mit, weil es
dieselbe Komponente ist. Deren Seitenabstand (`gap-6`) bleibt.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- [Meta Soft Primitives](2026-10-01-meta-soft-primitives.md)
