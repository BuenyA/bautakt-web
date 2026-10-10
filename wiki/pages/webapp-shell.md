# Webapp-Shell und Navigation

Wie die angemeldete Oberfläche in `apps/webapp` aufgebaut ist und welche
Informationsarchitektur gilt. Neuaufbau 2026-09-23 für Geschäftsführung und
Buchhaltung; seit 2026-10-10 auf Fluent UI 2 statt shadcn/ui
([fluent-ui.md](fluent-ui.md)).

## Zielgruppe

Die Webapp ist für **Geschäftsführung und Buchhaltung am Schreibtisch**. Die
Handwerker auf der Baustelle bleiben in der Handy-App. Das entscheidet im
Zweifel: dichte Tabellen und Tastaturbedienung schlagen große Touch-Ziele.

## Layout

Stand 2026-10-10 (dritter Durchgang nach Owner-Rückmeldung). `AppShell.tsx`
baut die Leiste aus Fluents `NavDrawer`:

- **Kopf in einer Zeile:** links Signet und „Bautakt“ (`AppItem`, führt zur
  Übersicht), rechts das Einklapp-Symbol (`PanelLeftContract20Regular`, eingeklappt
  `PanelLeftExpand20Regular`). Kein Hamburger in der Leiste — Owner-Vorgabe:
  wie in anderen Apps, und am Symbol soll man sehen, dass hier etwas einklappt.
- **Body:** die `NavItem`s mit 20px-Icons (`bundleIcon`, aktiv gefüllt).
- **Footer:** Einstellungen, `NavDivider`, Benutzermenü als Fluent-`Persona`
  (Firma, E-Mail, Avatar).

Farben, Abstände und Auswahl (neutrale Fläche plus Brand-Indikator) sind
Fluents Standard. Eigene Regeln gibt es für den Kopf, das Footer-Polster und
die Icon-Leiste.

**Icon-Leiste (eingeklappt, 68px):** Fluent kennt keine schmale Variante; die
Breite setzt eine eigene Klasse (`--fui-Drawer--size` greift am `NavDrawer`
nicht, gemessen 2026-10-10). Body und Footer verlieren dort ihr seitliches
Polster, jeder Eintrag ist ein 44px-Quadrat in der Mitte. Fluents Body hat
links 10 und rechts 4px Einzug; mit diesem Versatz saß jedes Icon links in
seiner Hover-Fläche (Owner-Rückmeldung). Gemessen danach: Eintrag 12px Rand
links und rechts, Icon darin 12/12. Fluents Auswahl-Balken (`::after` am `NavItem`) sitzt mit
festem Versatz im Eintrag und lag im 44px-Quadrat mitten im Icon; in der
Icon-Leiste steht er per Override links außerhalb des Eintrags (gemessen:
Balken 3,5–7,5px, Eintrag ab 11,5px). Der Avatar steht als Inhalt im Knopf, nicht
im Icon-Slot — der ist 20px und schnitt den 32px-Kreis ab. Namen stehen für
Screenreader im Eintrag (`sr-only`) und sichtbar als Tooltip. Zustand im Cookie
`bautakt_sidebar_state`.

Unter 768px ist die Leiste ein Overlay; dann öffnet ein Hamburger in der
Kopfzeile sie.

**Kopfzeile (56px):** Schnellsuche und Glocke. Die Brotkrumen sind entfernt
(Owner: „unnötig“).

**Schnellsuche** (`QuickSearch.tsx`, Fluent-`Combobox`): Seite oder Aktion
tippen, wählen, dort. Strg+K bzw. Cmd+K setzt den Fokus. Seiten sind die
Einträge der Leiste, die sichtbaren Hub-Karten und Einstellungen. Aktionen
(„Neuer Kunde“, „Zeit nachtragen“, „Auftrag anlegen“ …) springen auf die Liste
mit `?neu=1`; die Seite öffnet ihr Anlege-Panel über `useCreateFromUrl` und
nimmt den Parameter wieder heraus. Neue Rechnung und neues Angebot haben eigene
Routen. Sichtbar ist nur, was die Rechte erlauben (dieselben wie Leiste und
Anlegen-Knöpfe; Führung, keine Kontrolle).

⚠️ `useCreateFromUrl` hält `open` in einem Ref und öffnet einmal je `?neu=1`.
Als Effekt-Abhängigkeit löste jede neue Inline-Funktion den Effekt erneut aus,
bevor der Router den Parameter entfernt hatte: eine Render-Schleife mit
Dutzenden `open()` je Sekunde, das Panel ging sofort wieder zu.

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

Die Auswahl in der Leiste gilt auch für den Hub, solange eine seiner Zielrouten
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

Stand 2026-10-10 rendert `DataTable` mit Fluents `Table`, `TableHeaderCell`
(`sortable`, `sortDirection`, dazu `aria-sort`), `SearchBox`, `Menu` mit
`MenuItemCheckbox` für die Spalten und Fluent-`Button` für CSV und Blättern.
Die Logik (TanStack, `features.ts`, `csv.ts`) ist unverändert. Der Rahmen um
die Tabelle ist `rounded-xl border bg-card overflow-x-auto`; schmale Fenster
scrollen die Tabelle seitlich statt sie abzuschneiden.

Zeilen mit Klickziel sind fokussierbar, Enter und Leertaste lösen sie aus
(nur auf der Zeile selbst), eine Spalte mit `header: ''` ist eine
Aktionsspalte mit der Screenreader-Überschrift „Aktionen“
([#108](https://github.com/BuenyA/bautakt-web/issues/108)).

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

Stand 2026-10-10. `/auftraege` schaltet die Art mit Fluents `TabList`
(bis 2026-10-10 ein grauer shadcn-`Tabs`-Pill). Das ist nicht
`ListFilterChips`. Werte `order` · `quote`, Labels Aufträge ·
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

Stand 2026-10-10. Die Bauteile sind Fluent UI 2 mit den Standard-Themes; Radien,
Höhen, Schrift und Farben sind Fluents eigene. Welche Komponente was ersetzt
und welche Bautakt-Bausteine es in `packages/ui` gibt, steht in
[fluent-ui.md](fluent-ui.md).

Eine destruktive Aktion im Auftrags-Panel sitzt links in der Fußleiste
(`DangerButton` mit `sm:mr-auto`), Abbrechen und Speichern rechts. Ab `sm`
darf die Zeile umbrechen. Das gilt für Notiz, Zeit, Material, Checkliste und
Bautagebuch.

Bis 2026-10-10 galt hier der „Meta-Feeling“-Look aus shadcn-Klassen (Pill-Knöpfe
`rounded-full`, `h-11`, Electric `#0064E0`). Die Protokolle dazu bleiben unter
`logs/2026-10-01-meta-*`; die Werte gelten nicht mehr.

## Detailflächen

Stand 2026-10-01, Optik. Auftrag-Detail (`/auftraege/:id`) und Rechnung-Detail
(`/rechnungen/:id`) teilen eine Section-Hierarchie. Der Pass von damals hat
keine neuen Texte und keinen Upload gebracht. Zeiten auf dem Auftrag lassen
sich seit 2026-10-08 nachtragen; die Karte bleibt dieselbe Fläche und ist dann
ein Knopf. Siehe [auftragszeiten.md](auftragszeiten.md). Fotos lassen sich
seit demselben Tag hochladen; die Kachel bleibt dieselbe Fläche, darüber
liegt eine gestrichelte Ablegefläche. Siehe [auftragsfotos.md](auftragsfotos.md).
Die Checkliste unter den Notizen lässt sich seit 2026-10-08 abhaken; die Zeile
ist dieselbe Card. Siehe [auftragscheckliste.md](auftragscheckliste.md).
Das Bautagebuch steht seit demselben Tag unter dem Material; die Karte ist
dieselbe Fläche und bei Schreibrecht ein Knopf. Siehe
[bautagebuch.md](bautagebuch.md).

| Element                         | Look                                                                                                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Section                         | `flex flex-col gap-4`                                                                                                                                                                                                                         |
| Section-Titel `h2`              | `text-lg font-semibold tracking-tight text-foreground`                                                                                                                                                                                        |
| Nebenlink (z. B. „Alle Zeiten“) | `text-brand text-sm font-medium`, auf der Baseline des Titels                                                                                                                                                                                 |
| Notiz-, Zeit- und Berichtskarte | `rounded-xl border border-border bg-card shadow-sm`. Hover `border-border-strong`. Skelett `rounded-xl`.                                                                                                                                      |
| Foto-Kachel                     | Dieselbe Card-Fläche, `overflow-hidden`. Hover zusätzlich `shadow-md`. Bildunterschrift `bg-card px-2.5 py-2`. Lightbox-Bild `rounded-xl`.                                                                                                    |
| Foto-Raster                     | Weiter `grid-cols-2 sm:grid-cols-3 xl:grid-cols-4`.                                                                                                                                                                                           |
| Foto-Ablegefläche               | `rounded-xl border border-dashed border-border bg-card`. Beim Ziehen `border-brand-stroke` und `bg-primary/10`. Löschen auf der Kachel: `bg-card`, Icon `text-destructive`.                                                                   |
| Seitenwurzel                    | `gap-8` auf Auftrag, Rechnung, Kunde (`/kunden/:id`) und Einsatz (`/einsaetze/:id`), auch in Laden, Fehler und Nicht-gefunden. Auftragsbeschreibung und Einsatz-Notiz darüber: `max-w-3xl text-sm text-muted-foreground whitespace-pre-wrap`. |
| `DetailCard`                    | Titel `text-base font-semibold tracking-tight`. Label-Spalte `sm:grid-cols-[10rem_1fr]`. `dt` ist `text-muted-foreground`, `dd` `text-foreground whitespace-pre-wrap`.                                                                        |
| Rechnungs-Blocker               | `rounded-xl`, Padding `p-4`. Positions- und Zahlungstitel wie der `DetailCard`-Titel.                                                                                                                                                         |
| Zahlungszeile                   | `rounded-lg bg-surface/60 px-3 py-2`.                                                                                                                                                                                                         |

`DetailCard` ist geteilt (`components/common/DetailCard.tsx`). Dieselbe
Label-Spalte, derselbe Titel und `whitespace-pre-wrap` auf dem Wert (`dd`)
gelten deshalb auch auf Kunde, Einsatz und Einstellungen. Adresse und Notiz
brechen dadurch mehrzeilig, ohne eine eigene Klasse an der Zeile. Die
Einsatz-Notiz steht einmal als Lead über der Karte und einmal als
`DetailRow`; der Auftrags-Link bleibt `text-sm font-medium text-brand`.
Einstellungen behält `gap-6`. Listen, Sidebar und Login bleiben bei den Soft
Primitives oben.

## Icons und Theme

Stand 2026-10-10. Icons sind `@fluentui/react-icons` (SVG, Tree-Shaking).
`Regular` im Normalfall, in der Leiste `bundleIcon(Filled, Regular)`. Die
Flaticon-Uicons der Handy-App (drei TTFs, rund 2,8 MB) und `lucide-react` sind
aus dem Web entfernt; Web und Handy zeigen damit bewusst unterschiedliche
Symbole.

Hell/Dunkel über `ThemeProvider` (`apps/webapp/src/app/ThemeProvider.tsx`):
`FluentProvider` mit `lightTheme` oder `darkTheme` aus `@bautakt/ui`, Wahl im
localStorage (`bautakt-theme`), Standard: Systemeinstellung. Umgeschaltet wird
im Benutzermenü unten in der Leiste (Fluent `Menu`, Gruppe „Darstellung“ mit
`MenuItemRadio` Hell / Dunkel / Wie das System). Details und die drei
Dunkel-Abweichungen: [fluent-ui.md](fluent-ui.md).

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

Gebaut sind: Zahlung, Kunde, Auftrag (anlegen und Stammdaten ändern),
Zeiteintrag, Abwesenheit, Ausgabe, Mitarbeiter, Mahnung (mit Gebühr und
Verzugszinsen), der Beleg-Editor und Kostenstellen (anlegen und löschen).
Auftrag anlegen: [auftrag-anlegen.md](auftrag-anlegen.md). Auftrag
bearbeiten: [auftrag-bearbeiten.md](auftrag-bearbeiten.md). Kostenstellen:
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
