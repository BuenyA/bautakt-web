# Auftragsseite

Stand 2026-10-30. `/auftraege/:id` war eine lange Spalte: Stammdaten,
Beteiligte und darunter sieben volle Abschnitte (Fotos mit Ablegefläche,
Notizen, Checkliste, Zeiten, Material, Bautagebuch). Breit, flach, viel
Scrollen. Der Owner wollte eine kompakte Übersicht mit Vorschauen und je
Bereich eine eigene Adresse.

## Aufbau

- **Rahmen** `OrderDetailLayout`: lädt den Auftrag, zeigt den Kopf (Name,
  Status-Badge, darunter Kunde · Adresse · Zeitraum, rechts Zurück,
  Rechnung erstellen, Bearbeiten) und die Fluent-`TabList`. Darunter das
  `Outlet`. Laden, Fehler und Nicht-gefunden bleiben hier.
- **Reiter**: Übersicht · Fotos · Notizen · Checkliste · Zeiten · Material ·
  Bautagebuch. Jeder Reiter ist eine Route (`routes.orderSection`), die Pfade
  stehen in `orderSectionPaths` (`fotos`, `notizen`, `checkliste`, `zeiten`,
  `material`, `bautagebuch`).
- **Übersicht** `OrderOverviewPage`: Stammdaten (Beginn und Ende als ein
  „Zeitraum“, Beschreibung als Zeile) und Beteiligte nebeneinander, darunter
  ein Raster aus Vorschau-Karten (`md` zwei, `xl` drei Spalten).
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
| Notizen     | Die drei neuesten, Titel oder erste Zeile, Datum             |
| Checkliste  | „x von y erledigt“, Fortschrittsbalken, nächste drei offene  |
| Zeiten      | Stunden gesamt, die drei Mitarbeiter mit den meisten Stunden |
| Material    | Die drei neuesten Positionen mit Menge                       |
| Bautagebuch | Die drei neuesten Berichte, erste Zeile der Arbeit, Datum    |

Abhaken geht direkt in der Checklisten-Karte — die häufigste Handlung.

**Schnellaktion „Neu“** führt mit `?neu=1` auf die Unterseite; dort öffnet
`useCreateFromUrl` das Anlege-Panel. Ausnahme Fotos: ein Dateidialog lässt
sich nur aus einem Klick öffnen, nicht nach dem Seitenwechsel. Die Karte
führt deshalb auf die Upload-Fläche.

## Rechte

`useVisibleOrderSections` blendet Reiter und Karte aus: Checkliste ohne
`canViewChecklist`/`canEditChecklist`, Bautagebuch ohne
`canCreateAndViewReports` — dieselben Rechte, mit denen sich die Abschnitte
vorher selbst ausgeblendet haben. Eine Unterseite ohne Recht leitet auf die
Übersicht. Die Grenze bleibt RLS.

## Offen

- Finanzen (Kosten gegen Auftragssumme, Abgerechnet) als Karte und Reiter.
- Dokumente auf `order_documents`, wie in der App.

## Code

- `apps/webapp/src/features/orders/pages/OrderDetailLayout.tsx`
- `apps/webapp/src/features/orders/pages/OrderOverviewPage.tsx`
- `apps/webapp/src/features/orders/pages/OrderSectionPage.tsx`
- `apps/webapp/src/features/orders/OrderPreviewCard.tsx`, `OrderPreviews.tsx`
- `apps/webapp/src/features/orders/orderSections.ts`
- `apps/webapp/src/lib/routes.ts` (`orderSectionPaths`, `orderSection`)
