# 2026-10-01 — Meta-Feeling Dark-Tokens

Die Dark-Flächen aus Dark Mode v2 (`#0F1115`, Card `#1E2430`, Primary `#4FA3E3`)
wirkten kalt und blaustichig. Die Vorgabe will Charcoal-Stufen und Electric Blue
nur im Dark, ohne Light-Primary, Statusfarben oder die Expo-Sidebar anzufassen.

## Was geändert wurde

Nur Tokens und die eine Klasse, die sonst die Active-Pill von 8px auf 12px
gezogen hätte.

- `.dark` in `packages/ui/src/styles/theme.css`: Canvas `#111112`, Sidebar
  `#161618`, Surface `#1A1A1D`, Card und Popover `#1F1F22`, `--card-raised`
  `#28292C` (Alias, nirgends als Klasse benutzt). Primary, Ring und
  Accent-Foreground `#0064E0`, `--primary-foreground` `#FFFFFF`.
- Light-Primary bleibt `#3B86E0`. `statusFills.blue` in `tokens.ts` ebenfalls.
  Destructive, Success und Warning sind dieselben Werte.
- Radien gemeinsam: sm 8 / md 12 / lg 16 / xl 24 / pill 9999. Schatten weich,
  Light und Dark getrennt, an die bestehenden `shadow-sm/md/lg` gehängt.
- Sidebar-Menübutton von `rounded-md` auf `rounded-sm`, damit die graue
  Active-Pill 8px bleibt. Kein Primary-Fill. Dot-Grid ist nicht drin.

## Warum hier und nicht zuerst in der App

Dieselbe datierte Ausnahme wie bei Dark Mode v2: die Vorgabe gilt für
`bautakt-web`. `bautakt-app` bleibt die Quelle für Statusfarben, nicht für
dieses Dark-Primary. Siehe
[beziehung-zu-bautakt-app.md](../pages/beziehung-zu-bautakt-app.md).

## Gemessen

Kontraste relativ zur neuen Fläche (WCAG 2.1, gerundet):

- `--foreground` `#FAFAFA` auf `--background`: 18.08:1
- Weiß auf `--primary` `#0064E0`: 5.39:1 (AA)
- `--primary` auf `--background`: 3.50:1, auf `--card`: 3.05:1 — über 3:1 für
  UI, unter AA 4.5:1 für Fließtext
- `--text-subtle` auf `--background`: 3.90:1, auf `--card`: 3.40:1
- `--text-placeholder` auf `--input`: 2.25:1 (bewusst, siehe Hinweis in
  `theme.css`)

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- `packages/ui/src/styles/theme.css`
- `packages/ui/src/components/ui/sidebar.tsx` (`rounded-sm` an der Pill)
