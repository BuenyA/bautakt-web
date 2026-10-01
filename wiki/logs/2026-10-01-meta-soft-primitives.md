# 2026-10-01 — Meta Soft Primitives

Die Meta-Tokens (Charcoal, Electric `#0064E0`, weiche Radien und Schatten) lagen
schon auf main. Die Shared Components nutzten sie noch nicht: Buttons und Badges
waren `rounded-md`, Listen eine harte `rounded-lg`-Box, Leerzustände gestrichelt,
der Seitenkopf mit voller Unterstreichung.

## Was geändert wurde

Nur Klassen. Keine neuen Komponenten, keine Props, keine Sort-/Such-/Export-Logik,
kein Marketing, keine Status-Hex, keine Sidebar-Active-Pill.

- `button.tsx`: Basis und Größen `rounded-full`. Default-Schatten `shadow-sm`.
  Farben und Höhen gleich.
- `badge.tsx`: `rounded-full`, Varianten gleich.
- `data-table.tsx`: Shell `rounded-xl border border-border bg-card shadow-sm`.
- `table.tsx`: Zelle `px-4 py-3`, Kopf `h-11 px-4`. Text weiter
  `text-muted-foreground`.
- `EmptyState.tsx`: weiche zentrierte Card, kein `border-dashed`.
- `PageHeader.tsx`: `pb-2` ohne `border-b`, Titel explizit `text-foreground` und
  `tracking-tight`, Beschreibung `mt-1.5`.
- `tabs.tsx`: Liste und Trigger `rounded-full`. Aktiv bleibt `bg-card`.
- `AuthCard.tsx`: Canvas `bg-background`, Karte `shadow-md`, Wortmarke
  `text-foreground`.
- `input.tsx` unverändert (`rounded-md`, `shadow-xs`).

## Warum die PageHeader-Variante ohne Linie

Die Spec lässt `pb-2` ohne Border oder `border-b border-border/60` zu. Gewählt
ist die erste: keine harte Unterstreichung. Der Seitenabstand bleibt über
`gap-6` der Listen.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- [Meta-Feeling Dark-Tokens](2026-10-01-meta-feeling-tokens.md)
- [Light-Primary Electric](2026-10-01-light-primary-electric.md)
