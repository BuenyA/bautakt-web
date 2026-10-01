# 2026-10-01 — Light-Primary auf Electric

Die Designer-Spec (Meta-Feeling, PR #26) hielt das Light-Primary bei Marketing-Blau
`#3B86E0`. Der Owner hat am selben Tag verlangt, dass Light dieselben CTAs, Ringe
und das blaue Status-Fill wie das Dark-Electric `#0064E0` benutzt. Marketing bleibt
auf der Spec.

## Was geändert wurde

Nur Tokens. Keine Layout- oder Feature-Änderung. Dark-Flächen und Dark-Primary
waren schon `#0064E0` und bleiben es. Die graue Sidebar-Pill (`#F3F4F6`) bleibt
grau.

| Token (Light, `:root`)                       | Vorher    | Nachher   |
| -------------------------------------------- | --------- | --------- |
| `--primary`, `--ring`, `--accent-foreground` | `#3B86E0` | `#0064E0` |
| `--sidebar-primary`, `--sidebar-ring`        | `#3B86E0` | `#0064E0` |
| `--primary-foreground`                       | `#FFFFFF` | `#FFFFFF` |
| `--accent`                                   | `#E8F2FC` | `#E6F0FC` |
| `statusFills.blue`                           | `#3B86E0` | `#0064E0` |

`--accent` ist 10 % `#0064E0` auf Weiß. `#E8F2FC` war auf das hellere
Marketing-Blau gemischt; auf Electric lag es bei 4.75:1, der neue Wash bei
4.68:1 und im selben Farbton (etwa 213°). Beides AA. Marketing-`#E8F2FC` wird
nicht erzwungen.

Destructive, Success, Warning und die übrigen `statusFills` sind unverändert.
`apps/marketing/` ist unangetastet; `globals.css` pinnt dort weiter `#3B86E0`
und `#E8F2FC`.

## Gemessen

Relative Luminanz, WCAG 2.1, gerundet:

- `#0064E0` auf `#FFFFFF`: 5.39:1 (AA; `#3B86E0` lag bei 3.70:1)
- `#FFFFFF` auf `#0064E0`: 5.39:1 (AA)
- `#0064E0` auf `#E6F0FC`: 4.68:1 (AA; `#3B86E0` auf `#E8F2FC` lag bei 3.27:1)

## Verweise

- [beziehung-zu-bautakt-app.md](../pages/beziehung-zu-bautakt-app.md)
- [webapp-shell.md](../pages/webapp-shell.md)
- [Meta-Feeling Dark-Tokens](2026-10-01-meta-feeling-tokens.md)
- `packages/ui/src/styles/theme.css`
- `packages/ui/src/tokens.ts`
