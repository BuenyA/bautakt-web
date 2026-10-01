# 2026-10-01 — Meta Listen und Formulare

Slice 1 hat Buttons, Badges und die Tabellen-Shell weich gemacht. Inputs,
Textareas und Select-Trigger trugen danach noch `rounded-md` und `shadow-xs`.
Sheet-Header und -Footer waren eine volle `border-border`, der Schließen-Knopf
eckig, der Zeilenhover `hover:bg-surface/60`.

## Was geändert wurde

Nur Klassen. Kein Feature, kein Router, kein Token-Rewrite, keine Sidebar,
keine Kunden- oder Einsatz-Detailfläche, kein Marketing.

- `input.tsx` und `textarea.tsx`: `rounded-sm`, `shadow-xs` entfernt. Höhe und
  Fokusring gleich.
- `select.tsx`: Trigger wie Input. Content `rounded-xl`. Item bleibt
  `rounded-sm`.
- `data-table.tsx`: Außenabstand `gap-4`. Toolbar-Zeile weiter `gap-2`.
  Leer-Zelle `p-2` (siehe unten). Shell weiter `rounded-xl shadow-sm`.
- `table.tsx`: Hover `hover:bg-surface/40`. Kopf und Zelle aus Slice 1.
- `sheet.tsx`: Titel `tracking-tight`. Header und Footer `border-border/60`.
  Schließen `rounded-full`. Breite, Seite und Animation gleich.

Aufträge, Zeiten und Rechnungen setzen keinen lokalen `rounded-md` oder
`shadow-xs` auf Inputs. Die Listen-Seiten bleiben unangetastet; Suche und
Sheets erben die Shared Controls.

## Warum die Leer-Zelle `p-2` hat

`EmptyState` ist eine eigene Card mit Border. In der Zelle mit `p-0` klebt
diese Border an der Shell, und `overflow-hidden` schneidet die Ecken ab. `p-2`
lässt einen schmalen Rand. Außerhalb der Tabelle bleibt Empty unverändert.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- [Meta Soft Primitives](2026-10-01-meta-soft-primitives.md)
