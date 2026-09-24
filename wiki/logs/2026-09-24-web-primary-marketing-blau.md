# Web-Light-Primary auf Marketing-Blau

_Stand 2026-09-24._

Light-Primary in `packages/ui` war LinkedIn-Blau `#0A66C2`, Marketing schon Spec-Blau
`#3B86E0`. Die Webapp wirkte deshalb neben der Marketing-Seite wie ein zweites Blau.
Flächen, Text und Statusfarben bleiben; nur Primary, Accent und Ring im Light-Modus
sowie `statusFills.blue` ziehen nach.

| Token                                                | Vorher    | Nachher     |
| ---------------------------------------------------- | --------- | ----------- |
| `--primary`, `--accent-foreground`, `--ring` (Light) | `#0A66C2` | `#3B86E0`   |
| `--accent` (Light)                                   | `#E7F3FF` | `#E8F2FC`   |
| `--primary-foreground` (Light)                       | `#FFFFFF` | `#FFFFFF`   |
| Dark `--primary` / `--ring` / `--accent-foreground`  | `#4FA3E3` | unverändert |
| `statusFills.blue`                                   | `#0A66C2` | `#3B86E0`   |

Gemessen (relative Luminanz, WCAG 2.1): `#3B86E0` auf Weiß 3.70:1, auf `#E8F2FC`
3.27:1. Das liegt unter AA für normalen Text (4.5:1) und über 3:1 für große Schrift
und UI-Komponenten. Der alte Wert `#0A66C2` lag auf Weiß bei 5.69:1. Dark `#4FA3E3`
auf `#0D0E14` bleibt 7.05:1; `#3B86E0` käme dort auf 5.20:1, der hellere Dark-Ton
bleibt trotzdem.

Die Mobile-App behält `#0A66C2` bis zu einem eigenen PR. Kein Brand-Orange.
