# Auftragsnotizen

Die Auftragsdetailseite zeigt die Notizen, die die Handy-App zu einem Auftrag
schreibt. Die Webapp liest sie und schreibt nichts: kein Anlegen, kein
Bearbeiten, kein Löschen.

## Warum nur lesen

Die Webapp ist der Schreibtisch für Geschäftsführung und Buchhaltung. Notizen
entstehen auf der Baustelle, offline-fähig, in der Handy-App. Eine zweite
Schreibstelle hier würde dieselben Zeilen noch einmal erzeugen, ohne dass die
Detailansicht das braucht.

## Was die Seite tut

`OrderNotes` steht unter der Stammdatenkarte auf `OrderDetailPage`, direkt
unter der Fotogalerie. Vier Zustände: Skelett beim Laden, Fehler mit „Erneut
versuchen", leerer Hinweis („Noch keine Notizen", Hinweis auf die Handy-App),
Liste der Notizkarten.

Jede Karte zeigt Titel und Text, soweit sie nicht leer sind, dazu den
Zeitstempel von `created_at` und den Namen aus `profiles`, wenn die Zeile über
`user_id` ein sichtbares Profil hat. Liegt `modified_at` später, steht daneben
„Geändert …". Fehlt der Name, bleibt die Notiz sichtbar — nur ohne Autor.

Die Abfrage steckt in `useOrderNotes`: `order_notes`, gefiltert auf die
`company_id` der Mitgliedschaft und die `order_id`, sortiert nach `created_at`
absteigend. Der `queryKey` ist `['order-notes', companyId, orderId]`.

Sortiert wird nach dem Schreibzeitpunkt, nicht nach `modified_at`. Der
auftragsspezifische Index heißt `order_notes_order_id_modified_at_idx` und
liegt auf `(order_id, modified_at DESC NULLS LAST, created_at DESC)`.
`modified_at` hat keinen Default und ist null, bis die App ihn später setzt.
`NULLS LAST` würde eine frisch geschriebene Notiz hinter jede bereits
geänderte schieben. _Stand 2026-09-24: die drei vorhandenen Zeilen haben
`modified_at` jeweils nach `created_at`._

## Grenze

_Stand 2026-09-24._ Lesen hängt an der Betriebsmitgliedschaft und zusätzlich an
`canViewNotes` oder `canCreateNotes`. Die Select-Policy heißt „Members can view
order notes". Insert, Update und Delete heißen „Members can … order notes" und
verlangen `canCreateNotes`. Diese Seite ruft keines davon auf. Policies stehen
im Wiki von `bautakt-app` und werden hier nicht kopiert:
<https://github.com/BuenyA/craft/blob/main/wiki/index.md>.

Ohne das Leserecht liefert die Abfrage keine Zeilen. Die Oberfläche zeigt dann
denselben leeren Hinweis wie bei einem Auftrag ohne Notizen. Die Datenbank
bleibt die Grenze; ein ausgeblendeter Block wäre keine Kontrolle.

Die generierten Typen in `packages/supabase/src/database.types.ts` enthalten
`order_notes` bereits (`title`, `body`, `created_at`, `modified_at`,
`user_id` → `profiles`). Diese Änderung hat das Schema nicht angefasst.
