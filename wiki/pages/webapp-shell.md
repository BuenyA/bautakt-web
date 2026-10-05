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

Stand 2026-10-01. Die Top-Leiste hat **zehn Punkte, ohne Sektionsüberschriften**.
Die Begriffe bleiben die der Handy-App. Aufträge und Zeiten sind ein Klick.
Überfüllte Bereiche sind ein Hub, nicht achtzehn Zeilen.

Der Stand bis dahin war das Gegenteil: gruppiert unter Arbeit / Finanzen /
Team / Stammdaten, weil ein Hub am Rechner ein zusätzlicher Klick vor jeder
Rechnung gewesen wäre. Der Owner hat das am 01.10.2026 umgedreht. Die Sidebar
bleibt bei zehn Punkten; Rechnungen ist bewusst der zweite Klick, über die
erste Karte im Finanzen-Hub.

| #   | Eintrag       | Ziel             | Art                    |
| --- | ------------- | ---------------- | ---------------------- |
| 1   | Übersicht     | `/uebersicht`    | Direkt (HOME)          |
| 2   | Aufträge      | `/auftraege`     | Direkt                 |
| 3   | Einsätze      | `/einsaetze`     | Direkt                 |
| 4   | Zeiten        | `/zeiten`        | Direkt                 |
| 5   | Kalender      | `/kalender`      | Direkt                 |
| 6   | Finanzen      | `/finanzen`      | Hub                    |
| 7   | Mitarbeiter   | `/personal`      | Hub                    |
| 8   | Kunden        | `/kunden`        | Direkt                 |
| 9   | Material      | `/material`      | Hub                    |
| 10  | Einstellungen | `/einstellungen` | Direkt, Fuß der Leiste |

Definiert in `components/layout/navItems.ts`, die Karten in
`features/hubs/hubs.ts`. Ein Hub-Punkt fehlt, wenn **keine** seiner Karten
sichtbar ist. Die Karten filtern einzeln, mit denselben Rechten wie die
frühere flache Zeile. Listen- und Detail-URLs sind nicht umgezogen
(`/rechnungen`, `/mitarbeiter`, `/katalog`, …). `/finanzen` ist die Hub-Seite;
der Redirect auf Rechnungen ist weg.

Einstellungen bleibt im Fuß, abgesetzt, und zählt als zehnter Punkt.
Benachrichtigungen sind die Topbar-Glocke, kein Nav-Eintrag.

Die graue Active-Pill gilt auch für den Hub, solange eine seiner Zielrouten
offen ist: `/rechnungen` hält „Finanzen“ markiert, `/mitarbeiter` hält
„Mitarbeiter“.

## Hub-Seiten

`/finanzen`, `/personal` und `/material` sind Landings (`HubPage`): `PageHeader`
und ein Kartenraster. Breite bis 1120px, links ausgerichtet. Das Padding kommt
von der Shell (`p-4 sm:p-6`), die Seite legt keins dazu. Raster: eine Spalte,
ab `sm` zwei, ab `lg` drei, `gap-4`.

Die Karte ist ein Router-Link über die ganze Fläche: `rounded-xl` (24px),
`bg-card`, `border-border`, `shadow-sm`, `p-5`, Mindesthöhe 120px. Das Icon
(22px, `text-primary`) sitzt in einem Well (`size-10`, `rounded-lg`, Light
`bg-accent`, Dark `bg-card-raised`). Hover: `border-border-strong`, `shadow-md`,
Light `bg-surface`, Dark `bg-card-raised`, 150ms. Fokus: `ring-2 ring-ring`,
Offset 2. Gedrückt: Deckkraft 0.95. Kein Primary-Fill.

Rechnungen ist die einzige Featured-Karte: erste Zelle, `ring-1 ring-primary/30`
und `sm:col-span-2`.

| Hub         | Karte                  | Ziel             | Recht wie bisher                  |
| ----------- | ---------------------- | ---------------- | --------------------------------- |
| Finanzen    | Rechnungen (Featured)  | `/rechnungen`    | Abrechnung oder GF-Rechnungssicht |
| Finanzen    | Angebote               | `/angebote`      | dasselbe                          |
| Finanzen    | Offene Posten          | `/offene-posten` | `canViewCompanyFinance`           |
| Finanzen    | Ausgaben               | `/ausgaben`      | Finanzen oder Gemeinkosten        |
| Finanzen    | Mahnwesen              | `/mahnwesen`     | Abrechnung oder Finanzen          |
| Finanzen    | Auswertungen           | `/auswertungen`  | `canViewCompanyFinance`           |
| Mitarbeiter | Mitarbeiterverzeichnis | `/mitarbeiter`   | `canManageEmployees`              |
| Mitarbeiter | Abwesenheiten          | `/abwesenheiten` | `canManageAbsences`               |
| Mitarbeiter | Lohn                   | `/lohn`          | Lohnkosten oder Sätze             |
| Mitarbeiter | Mitarbeiter hinzufügen | `/mitarbeiter`   | `canManageEmployees`              |
| Material    | Katalog                | `/katalog`       | `canManageCatalog`                |
| Material    | Kostenstellen          | `/kostenstellen` | `canManageCostCenters`            |

„Mitarbeiter hinzufügen“ hängt kein `?neu=1` an. Die Liste öffnet das
Anlege-Sheet über den bestehenden Button; eine Create-Query gibt es nicht
(Stand 2026-10-01, `EmployeesListPage`).

Sind nach dem Rechtefilter null Karten übrig, zeigt die Seite das bestehende
`EmptyState` („Keine Bereiche freigeschaltet“). Das passiert beim Direktaufruf,
wenn die Leiste den Punkt schon ausgeblendet hat. Solange die Mitgliedschaft
lädt, steht ein `PageSpinner` — sonst blitzt der Leerzustand auf, weil
`hasPermission` ohne Rechte auf false fällt. Schlägt das Laden fehl, ist das
ein Fehler-EmptyState mit „Erneut versuchen“, nicht der Rechte-Leerzustand.

## Rechte

Nav-Einträge filtert `maySee`. Ein direkter Punkt prüft sein eigenes Recht
(`hasPermission`); ein Hub-Punkt ist sichtbar, sobald mindestens eine Karte
denselben Check besteht. `anyPermission` genügt sich mit einem der Rechte
(Rechnungen sehen Buchhaltung **oder** GF). Die Hub-Seite selbst hat keinen
`RequirePermission`: null sichtbare Karten sind das `EmptyState`, nicht
„Kein Zugriff“. Die Zielrouten behalten ihren Wächter.

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

## Mitarbeiterverzeichnis

Stand 2026-10-01. `/mitarbeiter` filtert clientseitig mit
`ListFilterChips` (Pattern A, `apps/webapp/src/components/common/ListFilterChips.tsx`):
`rounded-full`, inaktiv `bg-input text-muted-foreground`, aktiv
`bg-primary text-primary-foreground`. Die Chips sitzen im Toolbar-Slot links
neben der bestehenden Suche. CSV und Spalten bleiben.

Default ist **Aktiv**. Ohne Query oder bei unbekanntem Wert gilt `active`.
`?status=all|pending|inactive` schaltet um; Aktiv löscht den Param. Schlüssel
und Labels: `all` Alle · `active` Aktiv · `pending` Ausstehend · `inactive`
Inaktiv.

`ended_at` ist inaktiv, sonst aktiv (`employmentListStatus`). Ein
Pending-Flag gibt es an `employments` nicht — Einladungen liegen in
`employment_invitations`, und `user_id` null ist eine manuelle Beschäftigung,
kein Ausstehend. Der Chip bleibt; der Filter ist dann leer. Bei `all` und
gemischten Status (aktuell und ausgeschieden) setzt `DataTable` `sectionOf`
die Titel „Aktive Mitarbeiter“ / „Ehemalige Mitarbeiter“, solange nicht
sortiert wird. Reines Aktiv bleibt eine flache Liste.

## Kundenliste

Stand 2026-10-01. `/kunden` filtert clientseitig mit denselben
`ListFilterChips`. Default ist **Alle**. Ohne Query oder bei unbekanntem
Wert gilt `all`. `?filter=company|private` schaltet um; Alle löscht den
Param. Labels: Alle · Firmen · Privat.

`company` ist `customer_type` `b2b`, `private` ist `b2c`. Andere Typen
lässt der Check nicht zu. CSV, Spalten und die DataTable-Suche bleiben.

## Rechnungsliste

Stand 2026-10-01. `/rechnungen` filtert die Belegart mit denselben Chips,
`nowrap`, weil die Labels lang sind. Default ist **Rechnungen**
(`invoice`). Ohne `filter` oder bei unbekanntem Wert gilt das. Chips:
Rechnungen · Auftragsbestätigungen · Lieferscheine · Alle. Schlüssel:
`invoice` · `order_confirmation` · `delivery` · `all`.

`invoice` umfasst `invoice`, `partial_invoice` und `final_invoice` — Abschlag
und Schluss sind Rechnungen, eigene Chips hat die App nicht. `delivery` ist
der Chip, gespeichert ist `delivery_note`. `all` zeigt nur die Arten dieser
Liste. Angebote bleiben auf `/angebote`. Gutschrift und Storno haben keinen
Chip und werden nicht mitgeladen.

Die Status-Tabs (offen, überfällig, Entwurf, bezahlt) sind weg. Ein
bestehender Deep-Link `?status=offen|ueberfaellig|entwurf|bezahlt` filtert
weiter mit, ohne Chip-Oberfläche. Die Typ-Chips lassen den Param stehen.

## Auftragsliste

Stand 2026-10-05. `/auftraege` schaltet die Art mit dem grauen `Tabs`-Pill
(Pattern B: Track `bg-surface`, aktiv `bg-card` und `text-foreground`). Das
ist nicht `ListFilterChips`. Werte `order` · `quote`, Labels Aufträge ·
Angebote. Default ist **Aufträge**. Ohne Query oder bei unbekanntem
`status` gilt `order`. `?status=quote` ist Angebote — derselbe Param wie
der bisherige Angebote-Tab.

Keine Status-Chips. `sectionOf` setzt „Laufende Aufträge“ und
„Abgeschlossen“ bzw. „Angebote“ und „Abgelehnt“. Beide Gruppen der Art
stehen in der Liste; ein Chip „nur aktiv“ gibt es nicht. Eine leere
Gruppe hat keine Überschrift, weil `sectionOf` nur über Zeilen läuft.
Sortiert der Nutzer, verschwinden die Überschriften. Innerhalb einer
Gruppe bleibt `created_at` absteigend.

`finished` ist abgeschlossen. `active` und jeder Status, der weder
Angebot noch abgelehnt ist, läuft. `quote` ist das offene Angebot,
`declined` ist abgelehnt. Die Abfrage lädt alle Aufträge des Betriebs;
die Art filtert clientseitig, damit beide Gruppen aus demselben Cache
kommen. `useOrders` hat keinen Filter-Parameter mehr.

## Zeitenliste

Stand 2026-10-05. `/zeiten` filtert clientseitig mit denselben
`ListFilterChips`, `flex-wrap`. Default ist **Woche**. Ohne `period`
oder bei unbekanntem Wert gilt `week`. `?period=today|month` schaltet
um; `day` liest denselben Chip wie `today`. Woche löscht den Param.
Labels: Heute · Woche · Monat. Schlüssel: `today` · `week` · `month`.

Der Zeitraum ist der lokale Kalendertag, die Kalenderwoche ab Montag
oder der Kalendermonat, gemessen an `started_at`. Einträge später am
selben Tag, in derselben Woche oder im selben Monat bleiben drin. Der
Auftrags-Deep-Link `?order=` bleibt und wird vom Zeitraum nicht gelöscht.

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

| Element                         | Look                                                                                                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Section                         | `flex flex-col gap-4`                                                                                                                                                                                                                         |
| Section-Titel `h2`              | `text-lg font-semibold tracking-tight text-foreground`                                                                                                                                                                                        |
| Nebenlink (z. B. „Alle Zeiten“) | `text-primary text-sm font-medium`, auf der Baseline des Titels                                                                                                                                                                               |
| Notiz- und Zeitkarte            | `rounded-xl border border-border bg-card shadow-sm`. Hover `border-border-strong`. Skelett `rounded-xl`.                                                                                                                                      |
| Foto-Kachel                     | Dieselbe Card-Fläche, `overflow-hidden`. Hover zusätzlich `shadow-md`. Bildunterschrift `bg-card px-2.5 py-2`. Lightbox-Bild `rounded-xl`.                                                                                                    |
| Foto-Raster                     | Weiter `grid-cols-2 sm:grid-cols-3 xl:grid-cols-4`.                                                                                                                                                                                           |
| Seitenwurzel                    | `gap-8` auf Auftrag, Rechnung, Kunde (`/kunden/:id`) und Einsatz (`/einsaetze/:id`), auch in Laden, Fehler und Nicht-gefunden. Auftragsbeschreibung und Einsatz-Notiz darüber: `max-w-3xl text-sm text-muted-foreground whitespace-pre-wrap`. |
| `DetailCard`                    | Titel `text-base font-semibold tracking-tight`. Label-Spalte `sm:grid-cols-[10rem_1fr]`. `dt` ist `text-muted-foreground`, `dd` `text-foreground whitespace-pre-wrap`.                                                                        |
| Rechnungs-Blocker               | `rounded-xl`, Padding `p-4`. Positions- und Zahlungstitel wie der `DetailCard`-Titel.                                                                                                                                                         |
| Zahlungszeile                   | `rounded-lg bg-surface/60 px-3 py-2`.                                                                                                                                                                                                         |

`DetailCard` ist geteilt (`components/common/DetailCard.tsx`). Dieselbe
Label-Spalte, derselbe Titel und `whitespace-pre-wrap` auf dem Wert (`dd`)
gelten deshalb auch auf Kunde, Einsatz und Einstellungen. Adresse und Notiz
brechen dadurch mehrzeilig, ohne eine eigene Klasse an der Zeile. Die
Einsatz-Notiz steht einmal als Lead über der Karte und einmal als
`DetailRow`; der Auftrags-Link bleibt `text-sm font-medium text-primary`.
Einstellungen behält `gap-6`. Listen, Sidebar und Login bleiben bei den Soft
Primitives oben.

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

Sektionsüberschriften rendert die Web-Nav seit 2026-10-01 nicht mehr. Das
Primitive `SidebarGroupLabel` bleibt (12px / 600, `--text-subtle`, Title Case,
kein Uppercase), falls eine spätere Leiste sie wieder braucht. Sie waren nur
Beschriftung, keine Routen.

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
  Auftrag anlegen, Kostenstelle anlegen. Die Liste dahinter bleibt sichtbar.
  Das Formular wird nur gemountet, solange das Panel offen ist, und startet
  damit jedes Mal frisch;
  sonst steht beim nächsten Öffnen die vorige Eingabe da und verleitet zur
  Doppelbuchung.
- **Eigene Seite** für Belege mit Positionen (`DocumentEditorPage`). Eine
  Positionsliste mit Menge, Einzelpreis, Rabatt und Steuersatz braucht die volle
  Breite.

Was die Datenbank besser weiß, macht die Datenbank: die Belegnummer vergibt
`finalize_sales_document`, die Genehmigung einer Abwesenheit `approve_absence`.
Beide tragen Prüfungen, die ein direktes `update` umginge.

`update_document_payment_status` setzt den Beleg auf `paid`, sobald die
Zahlungssumme (Betrag plus Skonto) das Brutto erreicht **oder übersteigt**.
Einen Status `overpaid` gibt es nicht; den legt dieses Repo nicht an — das
Schema gehört `bautakt-app`. `openMinorOf` bleibt die noch einziehbare
Forderung und ist nie negativ, der Button „Zahlung erfassen“ hängt daran.
Der Überschuss kommt aus `overpaidMinor` in `@bautakt/finance`.
Liegt die Summe darüber, zeigt die Rechnungsdetailseite den Überschuss als
„Überzahlt“: dieselbe Hinweisfläche wie die Festschreib-Blocker, ein
Warning-Badge und in der Summe die Zeile „Überzahlt“ statt „Offen: 0,00 €“.
Teilzahlung und exakte Vollzahlung bleiben bei „Offen“. Im Zahlungsformular
erscheint der Hinweis, sobald Betrag plus Skonto den offenen Rest übersteigt;
die Buchung wird nicht abgelehnt. Stand 2026-10-05, Issue
[#37](https://github.com/BuenyA/bautakt-web/issues/37). Siehe
[fallstricke.md](fallstricke.md).

⚠️ Bearbeitet werden nur Entwürfe. `enforce_sales_document_immutability` sperrt
festgeschriebene Belege; der Editor zeigt für sie keinen Speichern-Knopf,
sondern den Hinweis auf Storno und Gutschrift.

⚠️ `orders`, `customers`, `absences`, `articles` und `cost_centers` haben **kein**
`DEFAULT gen_random_uuid()` — beim Anlegen muss der Client die `id` mitgeben
(siehe [fallstricke.md](fallstricke.md)). Die vollständige Liste steht dort.

Gebaut sind: Zahlung, Kunde, Auftrag, Zeiteintrag, Abwesenheit, Ausgabe,
Mitarbeiter, Mahnung (mit Gebühr und Verzugszinsen), der Beleg-Editor und
Kostenstellen (anlegen und löschen). Auftrag anlegen:
[auftrag-anlegen.md](auftrag-anlegen.md). Kostenstellen:
[kostenstellen.md](kostenstellen.md).

## Offen

- **Firmenstammdaten bearbeiten** — bewusst offen, siehe Abschnitt Schreiben.
- **E-Mail-Versand von Belegen** — dafür fehlt die Edge Function in
  `bautakt-app` (`finance-document-send` liefert 501). Bis dahin ist die
  Druckansicht der Weg zum Kunden. Eine fehlende, unbekannte oder ungültige
  Id auf `/rechnungen/:id/druck` zeigt denselben Nicht-gefunden- bzw.
  Ladefehler wie die Detailseite, mit Rückweg zur Liste — keinen Spinner.
  Der Briefkopf lädt weiter parallel und blockiert die Seite nicht.
- **Einladung von Mitarbeitern in die App** — läuft weiter über das Handy.
- **Katalog pflegen** — bisher nur lesend. Kostenstellen anlegen und löschen
  steht, siehe [kostenstellen.md](kostenstellen.md).
- **Mobilansicht** ist gebaut, aber noch nicht an einem echten Gerät geprüft.
