# Dark Mode v2 und Sidebar-Scrollbar

_Stand 2026-09-24._

Der Dark-Satz in `packages/ui/src/styles/theme.css` war ein violett-schwarzer Port
(`#0D0E14` / `#12141C`, Card `#212632` hart über Surface `#1B1F29`). Er ist jetzt ein
kühler Neutral mit klaren Stufen. Light-Primary `#3B86E0` / Accent `#E8F2FC` aus dem
selben Tag bleiben. Dark-Primary bleibt `#4FA3E3`. Kein Brand-Orange. Warning bleibt
`#FF5C00`.

| Token                                                                        | Vorher                   | Nachher               |
| ---------------------------------------------------------------------------- | ------------------------ | --------------------- |
| `--background`                                                               | `#0D0E14`                | `#0F1115`             |
| `--background-second`                                                        | `#12141C`                | `#161A22`             |
| `--background-third`                                                         | `#181B25`                | `#1C212B`             |
| `--surface` / `--input` / `--secondary` / `--muted`                          | `#1B1F29`                | `#1A1F28`             |
| `--card` / `--popover`                                                       | `#212632`                | `#1E2430`             |
| `--border` / `--border-strong`                                               | `#272C38` / `#3A4150`    | `#2A3140` / `#3D4656` |
| `--foreground`                                                               | `#F2F4F8`                | `#F0F2F5`             |
| `--text-secondary` / `--secondary-foreground`                                | `#B7BECC`                | `#A8B0BD`             |
| `--muted-foreground`                                                         | `#949DAE`                | `#8B93A3`             |
| `--text-subtle`                                                              | `#868FA0`                | `#6F7787`             |
| `--text-placeholder`                                                         | `#474E5C`                | `#4A5160`             |
| `--primary-foreground` / `--success-foreground` / `--destructive-foreground` | `#0D0E14` bzw. `#FFFFFF` | `#0F1115`             |
| `--accent`                                                                   | `#101F35`                | `#152536`             |
| `--destructive`                                                              | `#F25A5A`                | `#F87171`             |

Gemessen (relative Luminanz, WCAG 2.1): `#F0F2F5` auf `#0F1115` 16.85:1, `#4FA3E3` auf
`#0F1115` 6.91:1, `#6F7787` auf `#0F1115` 4.20:1 (unter AA für normalen Text).

Die Sidebar scrollt nur in `[data-sidebar="content"]` (`SidebarContent`). Dort liegt
die dünne Scrollbar: Firefox `scrollbar-width: thin`, WebKit 6px, Track transparent,
Thumb `--border-strong`, Hover `--muted-foreground`. Nicht auf `body`.
