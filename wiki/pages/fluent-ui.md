# Fluent UI in der Web-App

`apps/webapp` nutzt seit 2026-10-10 Fluent UI 2 (`@fluentui/react-components`
9.74.9, Icons `@fluentui/react-icons` 2.0.343, Kalender
`@fluentui/react-calendar-compat` 0.4.7, alle exakt gepinnt). shadcn/ui, Radix,
cva, `lucide-react`, `sonner`, `react-day-picker`, `cmdk` und die Uicons-Schrift
sind aus dem Repo entfernt. Die Marketing-Seite nutzt Fluent nicht; sie hat
eigene Tailwind-Komponenten in `apps/marketing/components/ui/`.

## Themes und Farben

Die Web-App nutzt Fluents **Standard-Themes**: `webLightTheme` hell,
`webDarkTheme` dunkel (`packages/ui/src/theme/themes.ts`). Keine eigene
Brand-Ramp, keine eigenen Farben — Owner-Entscheidung vom 2026-10-10. Eine
zunächst geplante Navy-Ramp (`fluent-brand.md`) wurde am selben Tag verworfen.

Im Dunkelmodus gibt es genau drei Abweichungen, ebenfalls Owner-Vorgabe:

| Was                | Wie                                                                            |
| ------------------ | ------------------------------------------------------------------------------ |
| Fehlertext         | `colorPaletteRedForeground1` und `colorStatusDangerForeground1` = `#eeacb2`    |
| Link gedrückt      | `colorBrandForegroundLinkPressed` = `#479ef5`                                  |
| Dialoge und Drawer | 1-px-Rahmen `colorNeutralStroke1`, Regel in `packages/ui/src/styles/theme.css` |

Das sind die einzigen Hex-Werte der App. Alles andere ist ein Fluent-Token.
Der Rahmen hängt an `:root[data-theme='dark']` und den stabilen Klassen
`fui-DialogSurface` / `fui-OverlayDrawer`; `data-theme` setzt der
`ThemeProvider`. Gemessen 2026-10-10: Rahmen `1px solid rgb(102, 102, 102)` an
Dialog und Drawer im Dunkeln.

## Provider

`apps/webapp/src/app/ThemeProvider.tsx` hält die Wahl (Hell / Dunkel / Wie das
System, localStorage `bautakt-theme`) und rendert `FluentProvider` mit dem
passenden Theme. Zusätzlich an `<html>`: `data-theme`, `color-scheme` und die
Canvas-Farbe aus dem Theme, damit beim Über-Scrollen keine weiße Fläche
hinter der dunklen App auftaucht.

Auch die Boot-Fehlerseite und die Messseite `/dev/datum` laufen in diesem
Provider (`main.tsx`); ohne ihn gäbe es die CSS-Variablen nicht.

Die Druckansicht (`InvoicePrintPage`) liegt in einem **eigenen**
`FluentProvider` mit `lightTheme`. So druckt der Beleg auch im Dunkelmodus
schwarz auf weiß, ohne die App umzuschalten.

## Tailwind und Fluent nebeneinander

Tailwind bleibt für **Layout und Abstände** (flex, grid, gap, p-, w-) an
eigenen Elementen. Farben, Schrift, Radien und Schatten kommen aus Fluent.
`packages/ui/src/styles/theme.css` legt die bisherigen Utility-Namen auf
Fluent-Variablen: `bg-card` ist `--colorNeutralBackground1`,
`text-muted-foreground` ist `--colorNeutralForeground3`, `bg-primary` ist
`--colorBrandBackground`. Text in Brand-Farbe ist **`text-brand`**
(`--colorBrandForeground1`), nicht `text-primary`: im Dunkeln hat Fluent für
Brand-Text einen helleren Ton als für die Brand-Fläche.

⚠️ **Tailwind-Klassen auf Fluent-Komponenten verlieren oft.** Tailwinds
Utilities liegen in einer Cascade-Layer, Griffel (Fluents CSS-in-JS) schreibt
ungeschichtet — ungeschichtet gewinnt immer. `className="h-9"` auf einem
Fluent-`Input` oder `className="p-0"` auf einem `PopoverSurface` bewirkt
nichts. Stattdessen:

- Fluent-Props (`size`, `appearance`, `shape`),
- `makeStyles` mit `tokens` (z. B. `userButton` in `AppShell.tsx`),
- Slots (`input={{ className: 'text-right tabular-nums' }}` am `Input`),
- oder ein eigener Wrapper aus `div` (`SkeletonBlock`).

Was Griffel nicht setzt (Außenabstand, `grid-column`, `display` an
`DrawerBody`), darf weiter Tailwind sein.

⚠️ **Keine Klassen an den `FluentProvider`.** Fluent kopiert sie auf die
Portal-Knoten von Popover und Menü. Ein `min-h-svh` dort hat am 2026-10-10
beim Öffnen des Kalenders die ganze Seite weiß überdeckt. Die Mindesthöhe
trägt jetzt ein `div` im Provider. Wo ein Provider Klassen braucht
(Druckansicht), steht `applyStylesToPortals={false}`.

## Gestaltungsregeln

Festgelegt im zweiten Durchgang am 2026-10-10 nach Rückmeldung des Owners
(Leiste „katastrophal“, Knöpfe zu klein, Filter uneinheitlich):

- **Knöpfe in Fluents Standardgröße** (`medium`, 32px). `size="small"` (24px)
  nicht für Seiten- und Abschnittsaktionen.
- **Ein Primary-Knopf je Bereich.** Im leeren Zustand (`EmptyState`) steht die
  Aktion als Standard-Knopf, weil der Kopf des Abschnitts schon den Primary
  trägt.
- **Alle Listenfilter sind eine Fluent-`TabList`** (`ListFilterChips` rendert
  sie). Sie stehen in der `DataTable` in einer eigenen Zeile über Suche, CSV
  und Spalten.
- **Text-Aktionen** („Erneut versuchen“, „Alle Zeiten“) sind Fluents `Link`,
  nicht eigene Knöpfe mit `text-brand`.
- **Formularfelder füllen ihre Spalte.** Fluents `Input`, `Textarea` und
  `Select` sind von Haus aus nur so breit wie ihr Inhalt; `theme.css` setzt sie
  in `@layer base` auf `width: 100%`. Ohne das lag die PLZ über dem Ort.
- **Formulare im `FormDrawer` brauchen `w-full`.** Der Drawer ist ein
  Flex-Container in Zeilenrichtung; ohne `w-full` blieb das Formular rund 430px
  breit in einem 592px-Panel.
- Hub-Kacheln sind Fluent-`Card`s mit `CardHeader`; der Titel ist der Link.

## Bautakt-Bausteine in `packages/ui`

| Baustein                                                    | Wozu                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `lightTheme`, `darkTheme`                                   | Die Themes oben.                                                                        |
| `DataTable`                                                 | TanStack-Logik, Fluent-`Table`. Siehe [webapp-shell.md](webapp-shell.md#listen).        |
| `DatePicker`, `DateRangePicker`, `TimeInput`                | Deutsche Maske, Fluent-Optik. Siehe [datumseingabe.md](datumseingabe.md).               |
| `FormDrawer` + `FormDrawerTitle`, `-Description`, `-Footer` | `OverlayDrawer` von rechts für die kurzen Formulare; Titel mit Schließen-Knopf.         |
| `DangerButton`                                              | Primary-Button auf den Status-Danger-Tokens. Fluent hat keine Danger-Variante.          |
| `StatusBadge`                                               | Fluent-`Badge` mit Tönen `neutral`, `brand`, `success`, `warning`, `danger`, `outline`. |
| `SkeletonBlock`                                             | Fluent-`Skeleton`, Größe per Tailwind am Rahmen.                                        |
| `toast`, `AppToaster`                                       | `toast.success(text, { description })` an Fluents `Toaster`.                            |

In `apps/webapp/src/components/common/`: `LinkButton` (Fluent-`Button` als
`<a>` auf eine Route) und `useRouterLink` (`href` und Klick-Handler für jedes
Fluent-Bauteil, das als Link rendert: `NavItem`, `BreadcrumbButton`, `Button
as="a"`). Fluent kennt keine Router-Links; ein nackter `href` lädt die Seite
neu und verliert den Query-Cache.

## Zuordnung shadcn → Fluent

| shadcn                         | Fluent                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `Button` (default)             | `Button appearance="primary"`                                                            |
| `Button variant="outline"`     | `Button` (Standard)                                                                      |
| `Button variant="ghost"`       | `Button appearance="subtle"`                                                             |
| `Button variant="destructive"` | `DangerButton`                                                                           |
| `Button asChild` + `Link`      | `LinkButton`                                                                             |
| `Sheet`                        | `FormDrawer`, `DrawerHeader`, `DrawerBody`, `FormDrawerFooter`                           |
| `Dialog`                       | `Dialog`, `DialogSurface`, `DialogBody`, `DialogTitle`, `DialogContent`, `DialogActions` |
| `Select`                       | `Select` (nativ, Fluent-gestylt) mit `<option>`                                          |
| `Tabs`                         | `TabList` + `Tab`                                                                        |
| `Card` + `CardTitle`           | `Card size="large"` + `CardHeader header={<Text …>}`                                     |
| `Checkbox`                     | `Checkbox` (`onChange` liefert `checked`, auch `'mixed'`)                                |
| `DropdownMenu`                 | `Menu`, `MenuItemRadio`, `MenuGroupHeader`                                               |
| Sidebar                        | `NavDrawer`, `NavItem`, `Hamburger`                                                      |

⚠️ Fluents `onOpenChange` an `Dialog` und `OverlayDrawer` liefert `(event,
data)`, nicht den Wert: `onOpenChange={(_, { open }) => …}`. `FormDrawer`
übersetzt das zurück auf `(open) => …`, damit `useDismissLock` unverändert
bleibt.

⚠️ Ein natives `Select` zeigt nur Optionen, die es gibt. Ein Platzhalter ist
eine gesperrte erste Option mit `value=""`. Steht im Entwurf ein Wert, der
(noch) nicht in der Liste ist, braucht er eine eigene Option, sonst zeigt das
Feld die erste — so beim Auftrag im Zeiteintrag (`TimeEntrySheet`).

## Bekanntes

- Im Dev-Server meldet die Konsole einmal „Keyborg instance … is being disposed
  incorrectly“. Das ist Fluents Fokus-Bibliothek unter React-StrictMode
  (doppeltes Mounten im Dev). Im Produktions-Build erscheint sie nicht
  (geprüft 2026-10-10 mit `vite preview`: Konsole auf `/login`,
  `/passwort-vergessen` und einer 404-Route leer).
- Das Bundle der Web-App ist mit Fluent 1,78 MB groß (479 kB gzip, Build
  2026-10-10); Vite warnt ab 500 kB. Aufteilen nach Routen wäre der nächste
  Schritt, ist aber nicht Teil der Umstellung.
- Ein offener Popover mit `trapFocus` setzt den Rest der Seite auf
  `aria-hidden`. Playwright findet Felder dahinter dann nicht mehr per
  `getByRole` — vor dem Öffnen messen (siehe E2E-Test).
