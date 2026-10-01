# Webapp-Shell und Navigation

Wie die angemeldete Oberfläche in `apps/webapp` aufgebaut ist und welche
Informationsarchitektur gilt. Stand 2026-09-23: Neuaufbau mit shadcn/ui für
Geschäftsführung und Buchhaltung.

## Zielgruppe

Die Webapp ist für **Geschäftsführung und Buchhaltung am Schreibtisch**. Die
Handwerker auf der Baustelle bleiben in der Handy-App. Das entscheidet im
Zweifel: dichte Tabellen und Tastaturbedienung schlagen große Touch-Ziele.

## Layout

`SidebarProvider` / `Sidebar` / `SidebarInset` aus `@bautakt/ui` (shadcn).
Desktop: Sidebar links (240px, eingeklappt 64px Icon-Spalte), Topbar (56px)
mit Trigger, Brotkrumen, Firmenname und Glocke. Unter 1024px wird die Leiste ein
Overlay-Drawer. Innen 12px horizontal, 8px unter dem Logo, 2px zwischen den
Einträgen, Mindesthöhe 40px. Icons 18px, Abstand zum Label 10px.

Einklappen über den Trigger in der Topbar, den Kreis an der rechten Kante
(Hit-Fläche 32px, sichtbarer Kreis 28px, halb über der Border, Chevron) oder
`Strg`/`Cmd`+`B`. Der Zustand steht in einem Cookie (`bautakt_sidebar_state`),
**nicht** im localStorage: so steht er beim ersten Render fest und die Leiste
springt nach dem Laden nicht von breit auf schmal.

Eingeklappt bleiben die Icons stehen und zeigen den Namen als Tooltip. Die
Active-Pill wird dabei ein 40px-Quadrat mit Radius 8px um das Icon. Bewusst
nicht „ganz ausblenden": am Desktop verliert man damit die Anzeige, wo man ist.

## Navigation

Die Begriffe sind die der Handy-App, die **Anordnung bewusst nicht**. Am Telefon
liegt alles außer den Aufträgen unter „Unternehmen", weil dort nur fünf Reiter
Platz haben. Am Rechner wäre dieser Hub ein zusätzlicher Klick vor jeder
Rechnung, deshalb stehen die Bereiche flach nebeneinander, gruppiert:

| Gruppe         | Einträge                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| _(ohne)_       | Übersicht (`/uebersicht`, HOME)                                             |
| **Arbeit**     | Aufträge · Einsätze · Kalender · Zeiten                                     |
| **Finanzen**   | Angebote · Rechnungen · Offene Posten · Ausgaben · Mahnwesen · Auswertungen |
| **Team**       | Mitarbeiter · Abwesenheiten · Lohn                                          |
| **Stammdaten** | Kunden · Katalog · Kostenstellen                                            |
| _(unten)_      | Einrichtung · Nutzermenü mit Hell/Dunkel-Umschalter und Abmelden            |

Definiert in `components/layout/navItems.ts`. Eine Gruppe ohne sichtbare
Einträge verschwindet samt Überschrift — eine leere Überschrift „Finanzen" wäre
ein Hinweis auf etwas, das der Angemeldete nicht aufrufen kann.

Benachrichtigungen sind die Topbar-Glocke, kein Nav-Eintrag.

## Rechte

Nav-Einträge filtert `maySee` über `hasPermission`; Einträge mit `anyPermission`
genügen sich mit einem der Rechte (Rechnungen sehen Buchhaltung **oder** GF).

Die Routen selbst schützt `RequirePermission` und zeigt sonst „Kein Zugriff".

⚠️ **Beides ist Führung, keine Kontrolle.** Die verbindliche Grenze sind RLS und
die `enforce_*`-Trigger. Der Nutzen des Wächters ist ein anderer: ohne ihn sieht
ein Direktaufruf ohne Recht eine leere Tabelle und damit aus wie ein Fehler der
Anwendung statt wie eine fehlende Berechtigung.

## Listen

Alle Listen laufen über `DataTable` aus `@bautakt/ui` (TanStack Table v9):
sortieren, suchen, filtern, blättern, Spalten ein-/ausblenden, CSV-Export.
Keine Seite baut ihre eigene Tabelle — sonst fehlt genau dort eine dieser
Fähigkeiten.

Der CSV-Export nimmt die gefilterten und sortierten Zeilen: exportiert wird, was
man sieht. Semikolon, CRLF und BOM, weil Excel in deutscher Einstellung sonst
alles in eine Spalte legt und Umlaute zerlegt.

Beträge stehen rechtsbündig mit `tabular-nums`, damit die Stellen untereinander
liegen.

Die Listen-Shell (Stand 2026-10-01) ist eine weiche Card:
`rounded-xl border border-border bg-card shadow-sm overflow-hidden`. Der Kopf
bleibt `bg-surface` mit `text-muted-foreground`. Zellen sind `px-4 py-3`, der
Kopf `h-11` und `px-4` (`table.tsx`). Der Zeilenhover ist `hover:bg-surface/40`.
Außenabstand der `DataTable` ist `gap-4`; die Toolbar-Zeile (Tabs, Suche, CSV,
Spalten) bleibt `gap-2`. Die Suche erbt `h-9` und `sm:max-w-64`. Sortieren,
Suche und Export sind davon unberührt.

Die Leer-Zelle ist `p-2` (`data-table.tsx`). `EmptyState` trägt seit Slice 1
eine eigene Border (`rounded-xl border bg-card/50`). Mit `p-0` läge diese
Border bündig an der Shell — die Ecken schneidet `overflow-hidden` ab. Die
`8px` halten die Karte von der Shell-Kante.

## Optik der Shared Primitives

Stand 2026-10-01. Nur Klassen, keine neuen Komponenten und keine Feature-Diffs.
Die Tokens (`#0064E0`, Status-Hex, Sidebar-Grau) bleiben die aus
[Meta-Feeling](../logs/2026-10-01-meta-feeling-tokens.md) und
[Light-Primary Electric](../logs/2026-10-01-light-primary-electric.md).

| Primitive  | Look                                                                                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button     | Pill (`rounded-full`), auch `sm` / `lg` / `icon`. Default bleibt `bg-primary text-primary-foreground` mit `shadow-sm`. Höhen unverändert (`h-11` / `h-9` / `h-12` / `size-11`).                                                               |
| Badge      | `rounded-full`. Farbvarianten unverändert.                                                                                                                                                                                                    |
| EmptyState | Zentrierte weiche Card: `rounded-xl border border-border bg-card/50`, ohne gestrichelten Rand. Titel `font-semibold`.                                                                                                                         |
| PageHeader | Keine harte Unterstreichung (`pb-2` statt `border-b`). Titel `text-2xl font-semibold tracking-tight text-foreground`. Beschreibung `mt-1.5`.                                                                                                  |
| Tabs       | Liste und Trigger `rounded-full`. Aktiv bleibt `data-[state=active]:bg-card` — graue Pill, kein Primary-Fill.                                                                                                                                 |
| AuthCard   | Canvas `bg-background`. Karte zusätzlich `shadow-md` (Radius weiter von `Card`, `rounded-xl`). Wortmarke `text-foreground`.                                                                                                                   |
| Input      | `rounded-sm` (`--radius-sm`, 8px), ohne `shadow-xs`. Höhe weiter `h-11`, Fokusring `ring-[3px]` / `ring-ring/50`.                                                                                                                             |
| Textarea   | Wie Input: `rounded-sm`, kein `shadow-xs`.                                                                                                                                                                                                    |
| Select     | Trigger wie Input (`rounded-sm`, kein Schatten, Höhe unverändert). Content `rounded-xl`. Item bleibt `rounded-sm`.                                                                                                                            |
| Sheet      | Titel `text-base font-semibold tracking-tight text-foreground`. Header `border-b border-border/60`, Footer `border-t border-border/60`. Schließen `rounded-full`. Inhalt weiter `bg-card shadow-lg`; Breite, Seite und Animation unverändert. |

Die graue Sidebar-Active-Pill (`rounded-sm`, `#F3F4F6` / Dark `#1F1F22`) ist
nicht diese Button-Pill und bleibt grau.

## Detailflächen

Stand 2026-10-01. Auftrag-Detail (`/auftraege/:id`) und Rechnung-Detail
(`/rechnungen/:id`) teilen eine Section-Hierarchie. Nur Klassen: kein Upload,
kein CRUD, keine neuen Texte.

| Element                         | Look                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Section                         | `flex flex-col gap-4`                                                                                                                              |
| Section-Titel `h2`              | `text-lg font-semibold tracking-tight text-foreground`                                                                                             |
| Nebenlink (z. B. „Alle Zeiten“) | `text-primary text-sm font-medium`, auf der Baseline des Titels                                                                                    |
| Notiz- und Zeitkarte            | `rounded-xl border border-border bg-card shadow-sm`. Hover `border-border-strong`. Skelett `rounded-xl`.                                           |
| Foto-Kachel                     | Dieselbe Card-Fläche, `overflow-hidden`. Hover zusätzlich `shadow-md`. Bildunterschrift `bg-card px-2.5 py-2`. Lightbox-Bild `rounded-xl`.         |
| Foto-Raster                     | Weiter `grid-cols-2 sm:grid-cols-3 xl:grid-cols-4`.                                                                                                |
| Seitenwurzel                    | `gap-8`. Die Auftragsbeschreibung ist `text-sm text-muted-foreground`.                                                                             |
| `DetailCard`                    | Titel `text-base font-semibold tracking-tight`. Label-Spalte `sm:grid-cols-[10rem_1fr]`. `dt` ist `text-muted-foreground`, `dd` `text-foreground`. |
| Rechnungs-Blocker               | `rounded-xl`, Padding `p-4`. Positions- und Zahlungstitel wie der `DetailCard`-Titel.                                                              |
| Zahlungszeile                   | `rounded-lg bg-surface/60 px-3 py-2`.                                                                                                              |

`DetailCard` ist geteilt (`components/common/DetailCard.tsx`). Dieselbe
Label-Spalte und derselbe Titel gelten deshalb auch auf Kunde, Einsatz und
Einstellungen. Listen, Sidebar und Login bleiben bei den Soft Primitives oben.

## Icons und Theme

Icons sind die Flaticon-Uicons der Handy-App: die drei TTFs und die generierte
Glyph-Tabelle liegen in `packages/ui/src/icons/`. **Die Mobile-App ist
kanonisch**, der Generator bleibt drüben; neue Icons werden dort erzeugt und
hierher kopiert. Radix-interne Glyphen (Haken, Chevron) bleiben `lucide-react` —
das sind Bauteile der Primitives, keine Bautakt-Symbole.

Hell/Dunkel über `ThemeProvider` (Klasse `dark` am `<html>`, Wahl im
localStorage, Standard: Systemeinstellung). Die Farbwerte sind die Tokens aus
`packages/ui/src/styles/theme.css`.

Die `--sidebar-*`-Tokens sind seit 2026-09-24 eigene Werte (Expo-Docs-Optik),
keine Aliase auf `--accent` oder `--background-second`. Die Light-Sidebar ist
`#FFFFFF`. Der aktive Eintrag ist eine graue Pill (`#F3F4F6`, Dark `#1F1F22`,
Radius 8px über `rounded-sm`, Schrift 600) — nie ein Primary-Fill. Idle-Text ist
`--text-secondary` (`#374151` / Dark `#A1A1AA`). Hover im Light ist dieselbe
Fläche wie Active; im Dark die Surface `#1A1A1D` (`--sidebar-accent-hover`).
Primary (`--sidebar-primary` / `--sidebar-ring`, Light und Dark `#0064E0`)
bleibt dem Fokus-Ring (2px, Offset 2px) und Badge-Zahlen vorbehalten. Die
Pill-Klasse ist `rounded-sm`, weil `--radius-md` seit 2026-10-01 12px ist.

⚠️ `--sidebar-accent` nicht wieder auf `--accent` legen. Das war der
Wave-1-Stand und färbt den aktiven Eintrag blau (damals `#E8F2FC` mit
Vordergrund `#3B86E0`; die Accent-Fläche ist seit 2026-10-01 `#E6F0FC` mit
Vordergrund `#0064E0`).

Sektionsüberschriften (Arbeit, Finanzen, Team, Stammdaten) sind 12px / 600,
Title Case, Farbe `--text-subtle`. Kein Uppercase. Sie sind nur Beschriftung
der bestehenden Einträge, keine zusätzlichen Routen.

Dark (Stand 2026-10-01, Meta-Feeling) ist neutrales Charcoal:
Hintergrund `#111112`, Sidebar `#161618`, Surface `#1A1A1D`, Card `#1F1F22`,
angehoben `#28292C` (`--card-raised`, unbenutzt bis ein inneres Panel es
zieht). Primary im Dark ist Electric `#0064E0`, Vordergrund `#FFFFFF`.
Light-Primary ist seit dem Owner-Override am selben Tag dasselbe `#0064E0`.
Das ersetzt Dark Mode v2 (`#0F1115` / `#4FA3E3`).

Die Sidebar scrollt in `SidebarContent` (`data-sidebar="content"`,
`overflow-y-auto`). Nur dieses Element bekommt den schmalen Scrollbar (6px,
Thumb `--border-strong`, Track transparent). Der Wrapper trägt
`overflow-hidden`; die übrige Seite behält den Browser-Scrollbar. Die
Collapse-Kontrolle (`SidebarRail`) wird deshalb aus dem Wrapper gehoben,
sonst schneidet `overflow-hidden` den Kreis auf der Border ab.

## Datenabfragen

Jeder `queryKey` beginnt mit `companyId`. Fertig angebunden: Aufträge, Einsätze,
Zeiten, Kunden, Verkaufsbelege (`sales_documents`), Zahlungen, Eingangsrechnungen
und Mahnungen. Geld- und Kennzahlenlogik liegt in `@bautakt/finance`.

## Schreiben

Zwei Muster, bewusst getrennt:

- **Seitenpanel (Sheet)** für kurze Formulare — Zahlung erfassen, Kunde anlegen,
  Auftrag anlegen. Die Liste dahinter bleibt sichtbar. Das Formular wird nur
  gemountet, solange das Panel offen ist, und startet damit jedes Mal frisch;
  sonst steht beim nächsten Öffnen die vorige Eingabe da und verleitet zur
  Doppelbuchung.
- **Eigene Seite** für Belege mit Positionen (`DocumentEditorPage`). Eine
  Positionsliste mit Menge, Einzelpreis, Rabatt und Steuersatz braucht die volle
  Breite.

Was die Datenbank besser weiß, macht die Datenbank: die Belegnummer vergibt
`finalize_sales_document`, die Genehmigung einer Abwesenheit `approve_absence`.
Beide tragen Prüfungen, die ein direktes `update` umginge.

⚠️ Bearbeitet werden nur Entwürfe. `enforce_sales_document_immutability` sperrt
festgeschriebene Belege; der Editor zeigt für sie keinen Speichern-Knopf,
sondern den Hinweis auf Storno und Gutschrift.

⚠️ `orders`, `customers`, `absences`, `articles` und `cost_centers` haben **kein**
`DEFAULT gen_random_uuid()` — beim Anlegen muss der Client die `id` mitgeben
(siehe [fallstricke.md](fallstricke.md)). Die vollständige Liste steht dort.

Gebaut sind: Zahlung, Kunde, Auftrag, Zeiteintrag, Abwesenheit, Ausgabe,
Mitarbeiter, Mahnung (mit Gebühr und Verzugszinsen) und der Beleg-Editor.
Auftrag anlegen: [auftrag-anlegen.md](auftrag-anlegen.md).

## Offen

- **Firmenstammdaten bearbeiten** — bewusst offen, siehe Abschnitt Schreiben.
- **E-Mail-Versand von Belegen** — dafür fehlt die Edge Function in
  `bautakt-app` (`finance-document-send` liefert 501). Bis dahin ist die
  Druckansicht der Weg zum Kunden.
- **Einladung von Mitarbeitern in die App** — läuft weiter über das Handy.
- **Katalog und Kostenstellen pflegen** — bisher nur lesend.
- **Mobilansicht** ist gebaut, aber noch nicht an einem echten Gerät geprüft.
