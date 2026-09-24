# 2026-09-24 — Sidebar-Optik im Stil von Expo Docs

Die Leiste war die hellgraue Zweitfläche (`--background-second`, `#F7F8FA`) und
der aktive Eintrag lag auf `--accent` (`#E8F2FC`) mit blauem Text. Das las sich
wie eine hervorgehobene Karte. Die Vorgabe will die ruhige Expo-Docs-Leiste:
weiß, dichte Zeilen, graue Pill.

## Was geändert wurde

Nur Optik der Web-Sidebar. Routen, `navItems` und die Demo-Reihenfolge
Aufträge → Einsätze → Zeiten → Rechnungen sind unverändert. Kein neuer
Nav-Eintrag, kein Eingriff in Hauptinhalt, Topbar, Marketing oder die
Mobile-App.

- Breite 240px, eingeklappt 64px (`packages/ui/src/components/ui/sidebar.tsx`).
- `--sidebar*` in `packages/ui/src/styles/theme.css` sind eigene Werte, keine
  Aliase mehr. Light-Fläche `#FFFFFF`, Active-Pill `#F3F4F6` / Dark `#1E2430`.
  Hover im Dark ist `#1A1F28`. Ring `#3B86E0` / `#4FA3E3`.
- Eintrag: 14px / 500, aktiv 600, Mindesthöhe 40px, Abstand 2px, Innenabstand
  der Liste 12px, Icon 18px, Lücke zum Label 10px, Radius 8px.
- Sektionsüberschriften ohne Uppercase (12px / 600, `--text-subtle`).
- Collapse-Kreis (32px Hit-Fläche, 28px Kreis) halb auf der rechten Border.
  Er liegt ausserhalb des `overflow-hidden`-Wrappers, sonst wird er
  abgeschnitten.

## Warum keine Aliase

`--accent` ist das Marketing-Blau als Fläche. Ein Alias hätte den aktiven
Eintrag wieder blau gefärbt — genau das die Vorgabe ausschliesst. Primary
bleibt dem Fokus-Ring und Badge-Zahlen vorbehalten.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- `packages/ui/src/styles/theme.css`
- `packages/ui/src/components/ui/sidebar.tsx`
- `apps/webapp/src/components/layout/AppShell.tsx` (Logo-Ausrichtung, Footer)
