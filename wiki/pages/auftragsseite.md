# Auftragsseite

Stand 2026-10-31. `/auftraege/:id` war eine lange Spalte: Stammdaten,
Beteiligte und darunter sieben volle Abschnitte (Fotos mit Ablegefläche,
Notizen, Checkliste, Zeiten, Material, Bautagebuch). Breit, flach, viel
Scrollen. Der Owner wollte eine kompakte Übersicht mit Vorschauen und je
Bereich eine eigene Adresse.

## Aufbau

- **Rahmen** `OrderDetailLayout`: lädt den Auftrag, zeigt den Kopf (Name,
  Status-Badge, darunter Kunde · Adresse · Zeitraum, rechts Zurück,
  Rechnung erstellen, Bearbeiten) und die Fluent-`TabList`. Darunter das
  `Outlet`. Laden, Fehler und Nicht-gefunden bleiben hier.
- **Reiter**: Übersicht · Fotos · Dokumente · Notizen · Checkliste · Zeiten · Material ·
  Bautagebuch · Finanzen. Jeder Reiter ist eine Route (`routes.orderSection`),
  die Pfade stehen in `orderSectionPaths` (`fotos`, `dokumente`, `notizen`, `checkliste`,
  `zeiten`, `material`, `bautagebuch`, `finanzen`).
- **Übersicht** `OrderOverviewPage`: Stammdaten (Beginn und Ende als ein
  „Zeitraum“, Beschreibung als Zeile) und Beteiligte nebeneinander, darunter
  die Finanzkarte über die volle Breite, dann ein Raster aus Vorschau-Karten
  (`md` zwei, `xl` drei Spalten).
- **Unterseiten** `OrderSectionPage`: die bisherigen Abschnitte
  (`OrderPhotos`, `OrderNotes` …) unverändert in voller Breite.

## Vorschau-Karten

`OrderPreviewCard`: Fluent-`Card` mit Symbol, Titel, `CounterBadge`, rechts
höchstens eine Schnellaktion, unten „Alle anzeigen“. Höchstens drei Zeilen
(Fotos: vier Bilder), damit die Karten einer Reihe gleich hoch sind. Die
Karten nutzen dieselben Queries wie die Unterseiten — der Wechsel auf den
Reiter lädt nichts neu.

| Karte       | Inhalt                                                       |
| ----------- | ------------------------------------------------------------ |
| Fotos       | Die vier neuesten Bilder                                     |
| Dokumente   | Die drei neuesten, mit Symbol für die Dateiart, Datum        |
| Notizen     | Die drei neuesten, Titel oder erste Zeile, Datum             |
| Checkliste  | „x von y erledigt“, Fortschrittsbalken, nächste drei offene  |
| Zeiten      | Stunden gesamt, die drei Mitarbeiter mit den meisten Stunden |
| Material    | Die drei neuesten Positionen mit Menge                       |
| Bautagebuch | Die drei neuesten Berichte, erste Zeile der Arbeit, Datum    |

Abhaken geht direkt in der Checklisten-Karte — die häufigste Handlung.

**Schnellaktion „Neu“** führt mit `?neu=1` auf die Unterseite; dort öffnet
`useCreateFromUrl` das Anlege-Panel. Ausnahme Fotos und Dokumente: ein Dateidialog lässt
sich nur aus einem Klick öffnen, nicht nach dem Seitenwechsel. Die Karte
führt deshalb auf die Upload-Fläche.

## Rechte

`useVisibleOrderSections` blendet Reiter und Karte aus: Dokumente ohne
`canViewDocuments`, Checkliste ohne
`canViewChecklist`/`canEditChecklist`, Bautagebuch ohne
`canCreateAndViewReports` — dieselben Rechte, mit denen sich die Abschnitte
vorher selbst ausgeblendet haben. Eine Unterseite ohne Recht leitet auf die
Übersicht. Die Grenze bleibt RLS.

## Finanzen

Karte auf der Übersicht, zwei Leisten gegen die Auftragssumme:

- **Kosten** — Fluent-`ProgressBar` in Markenfarbe, `warning` ab 90 %,
  `error` über 100 % (`ORDER_COST_WARNING_PERCENT`, `orderCostLevel`).
  Darunter Lohn · Material · Sonstiges, bei Überschreitung stattdessen
  „Auftragssumme um … überschritten“.
- **Abgerechnet** — ausgestellte Rechnungen, darunter „… noch offen“
  (Auftragssumme − abgerechnet, nie unter 0). Grün ab 100 %.

Ohne Auftragssumme nur die Beträge, keine Leisten, und ein Hinweis.

Unterseite `/auftraege/:id/finanzen`: Kennzahlen (Auftragssumme, Kosten,
Abgerechnet, Ergebnis = abgerechnet − Kosten), links die Kostenaufteilung mit
den Kostenbelegen (Eingangsrechnungen verlinkt, Ausgaben auf die Liste),
rechts Angebote und Rechnungen mit Status.

**Rechnung** in `@bautakt/finance` (`computeOrderFinance`, getestet), Quellen
wie der Finanz-Teaser der App (`orderTeaserKpis.ts`):

- Beleg gehört zum Auftrag, wenn eine Position `order_id` trägt
  (`sales_documents` mit `sales_document_lines!inner`).
- Abgerechnet: `invoice`, `partial_invoice`, `final_invoice` in
  `ISSUED_STATUSES`, netto. Entwürfe, Stornos und Angebote zählen nicht.
- Material: Menge × `unit_cost`; Zeilen ohne EK zählen nicht.
- Sonstiges: `expenses` am Auftrag ohne kalkulatorische, dazu
  `incoming_invoices` am Auftrag außer `review_status = rejected`.
- Lohn: alle Zeiten des Auftrags × Kostensatz (`resolveCostRate`, ohne
  Zeitraum, geblättert über 1000 Zeilen).

Abweichungen von der App, bewusst: alles netto (der App-Teaser rechnet
Einnahmen brutto — gegen Netto-Kosten verglichen wäre das Ergebnis um die
Umsatzsteuer zu gut), und Eingangsrechnungen mit `order_id` zählen als
Kosten (die App lässt sie dort Stand 2026-10-30 weg). Stand 2026-10-30 hat
keine Eingangsrechnung und keine Ausgabe ein `order_id`.

**Rechte** (`orderFinanceAccess`), nach den Select-Policies vom 2026-10-30:

| Teil   | Recht                                                                         |
| ------ | ----------------------------------------------------------------------------- |
| Belege | `canViewOrderFinance`, `canUseBillingModule` oder `canViewManagementInvoices` |
| Kosten | `canViewOrderFinance` oder `canViewCompanyFinance`                            |
| Lohn   | Kosten und `canViewWageCosts`                                                 |

Kosten brauchen mehr als die Policy auf `expenses`: `order_materials` zeigt
ohne eines der beiden Rechte nur eigene Zeilen, die Summe wäre still zu
klein. Lohn braucht `canViewWageCosts`, weil `time_entries` sonst nur eigene
oder (mit `canTrackTimeForTeam`) Teamzeiten liefert und `labor_rates` ohne
das Recht leer sein kann. Ohne Lohn heißt die Leiste „Kosten ohne Lohn“.
Reiter und Karte erscheinen, sobald Belege oder Kosten sichtbar sind; wer
nur eines sieht, bekommt nur die eine Leiste.

## Dokumente

Dieselben Daten wie die Ordner-Ansicht der Handy-App: `order_documents`,
die Ordner aus `order_document_categories` (firmenweit, beim Anlegen eines
Betriebs gesät: Rechnungen, Angebote, Verträge, Baupläne, Mahnungen, Fotos &
Scans, Sonstiges).

- **Unterseite** `/auftraege/:id/dokumente`: oben „Ablegen in“ (Ordner,
  vorbelegt „Sonstiges“) und „Dokumente hochladen“, darunter die
  Ablegefläche (`FileDropzone`, dieselbe wie bei Fotos). Darunter je Ordner
  mit Inhalt eine Karte, leere Ordner fehlen. Eine Zeile zeigt Symbol, Name
  (Link öffnet die Datei in neuem Tab), Dateiname · Größe · Datum und ein
  Menü mit „Umbenennen oder verschieben“ und „Löschen“.
- **Hochladen**: PDF, JPEG, PNG, WebP, Word, Text, je bis 10 MB, wie der
  Bucket `order-documents` es verlangt. Name ist der Dateiname ohne Endung.
  Erst die Datei, dann die Zeile; scheitert das Insert, wird die Datei
  wieder entfernt. Pfad `{companyId}/{orderId}/{documentId}{.ext}` wie in der
  App. Fallstrick: supabase-js schickt eine Datei als Formulardaten, dann
  zählt der Typ der Datei selbst, nicht `contentType`. Browser geben Word
  oft ohne Typ weiter, deshalb wird die Datei mit dem geprüften Typ neu
  verpackt.
- **Archivierte Belege**: Rechnungen und Angebote aus dem Belegarchiv sind
  keine Kopie, sie zeigen auf `{companyId}/sales/…` im Bucket
  `finance-documents` (`isFinanceArchivePath`, wie in der App). Signiert
  wird dort; Löschen entfernt nur die Zeile am Auftrag, das Original bleibt.
  Ohne Finanzrecht liefert die Select-Policy diese Zeilen nicht.
- **Rechte** (gemessen 2026-10-31): Lesen von Zeilen, Ordnern und Dateien
  mit `canViewDocuments`; Hochladen, Ändern, Löschen mit
  `canUploadAndEditDocuments`. Ordner anlegen oder umbenennen gibt es im Web
  noch nicht.

## Code

- `apps/webapp/src/features/orders/pages/OrderDetailLayout.tsx`
- `apps/webapp/src/features/orders/pages/OrderOverviewPage.tsx`
- `apps/webapp/src/features/orders/pages/OrderSectionPage.tsx`
- `apps/webapp/src/features/orders/OrderPreviewCard.tsx`, `OrderPreviews.tsx`
- `apps/webapp/src/features/orders/orderSections.ts`
- `apps/webapp/src/features/orders/OrderFinance.tsx`, `useOrderFinance.ts`
- `apps/webapp/src/features/orders/OrderDocuments.tsx`, `OrderDocumentDialogs.tsx`,
  `useOrderDocuments.ts`, `useOrderDocumentMutations.ts`, `orderDocumentFiles.ts`
- `apps/webapp/src/components/common/FileDropzone.tsx`
- `packages/finance/src/orderFinance.ts`
- `apps/webapp/src/lib/routes.ts` (`orderSectionPaths`, `orderSection`)
