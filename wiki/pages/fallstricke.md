# Fallstricke

**Vor jeder Aufgabe lesen.** Was in diesem Repo bereits schiefgegangen ist oder sicher
schiefgeht, wenn man es nicht weiß. Jeder Eintrag nennt das Symptom zuerst — danach
sucht man.

## Erste Installation scheitert an einem fehlenden nativen Binding

_Festgestellt 2026-08-26._

**Symptom:** `npm run build` in `apps/webapp` bricht ab mit „Cannot find native binding.
npm has a bug related to optional dependencies", verursacht durch
`@rolldown/binding-win32-arm64-msvc`.

Das `package-lock.json` stammte aus einem GitHub-Runner unter Linux. npm trägt für
optionale, plattformspezifische Pakete nur die Varianten ein, die bei der Erzeugung
gebraucht wurden (npm/cli#4828). Auf dieser Maschine — **Windows auf ARM** — fehlte das
passende Binding also im Lockfile.

**Lösung:** `node_modules` und `package-lock.json` löschen, `npm install` neu ausführen,
das erzeugte Lockfile committen.

Betrifft potenziell auch `lightningcss-win32-arm64-msvc` (Tailwind v4) und
`@tailwindcss/oxide-win32-arm64-msvc`. Stand 2026-08-26 sind alle drei vorhanden und
Tailwind v4 läuft auf dieser Plattform.

## `.env` wurde nicht ignoriert, `.env.example` schon

_Behoben 2026-08-26._

**Symptom:** Ein Supabase-Key in `apps/web/.env` wäre committet worden. Umgekehrt tauchte
`apps/marketing/.env.example` nirgends auf.

Zwei getrennte Ursachen mit einer gemeinsamen Wurzel. Die Root-`.gitignore` bestand aus
zwei Zeilen und deckte `.env` gar nicht ab. Und als sie es tat, half die Negation
`!.env.example` für `apps/marketing/` trotzdem nicht: dort lag eine eigene `.gitignore`
mit `.env*`, und **die spezifischere verschachtelte Datei gewinnt**.

**Lösung:** Genau eine `.gitignore` im Root, keine verschachtelten. Prüfen lässt sich das
nur empirisch — `git check-ignore -v` liefert auch bei einem Negations-Treffer Exit 0 und
sieht deshalb aus wie „wird ignoriert". Stattdessen die Dateien anlegen und
`git status --porcelain --ignored` ansehen.

## Eingeloggte Nutzer fliegen beim Reload auf `/login`

**Symptom:** Nach einem Reload auf einer geschützten Route landet man auf der
Anmeldeseite, obwohl die Sitzung gültig ist.

Das Wiederherstellen der Sitzung aus dem `localStorage` ist asynchron. Im ersten
Render-Durchlauf ist `session` noch `null`. Ohne ein `initializing`-Flag leitet der Guard
in genau diesem Moment um.

**Lösung:** `AuthProvider` führt `initializing`, und `ProtectedRoute` prüft es **vor**
der Session. Der mit Abstand häufigste Fehler in diesem Muster. Der Test dafür ist ein
Hard-Reload auf `/auftraege`, nicht ein Klick dorthin.

## `await` im `onAuthStateChange`-Callback blockiert

**Symptom:** Die App friert nach dem Anmelden ein oder eine Abfrage kehrt nie zurück.

supabase-js hält während des Callbacks einen Lock. Ein `await supabase.from(...)` darin
kann deadlocken.

**Lösung:** Der Callback setzt ausschließlich State. Alles Weitere — etwa die
Mitgliedschaft — läuft als eigene TanStack-Query außerhalb.

## Der nächste Nutzer sieht die Daten des vorherigen

**Symptom:** Nach Abmelden und Anmelden mit einem anderen Konto stehen kurz oder
dauerhaft Zeilen des vorigen Nutzers im Bild.

Der Query-Cache überlebt den Nutzerwechsel.

**Lösung:** `queryClient.clear()` bei `SIGNED_OUT` **und** jeder `queryKey` beginnt mit
dem Mandanten (`companyId`) bzw. der `userId`. In diesem Projekt gab es bereits ein
echtes mandantenübergreifendes Leck (`resolve_labor_rate`, dokumentiert im Wiki von
`bautakt-app`) — das ist keine hypothetische Fehlerklasse.

## Direktaufruf einer Unterroute gibt in Produktion 404

**Symptom:** `https://app.bautakt.com/auftraege` funktioniert per Klick, aber ein Reload
oder ein geteilter Link liefert Vercels 404. Lokal tritt das **nie** auf.

Der Vite-Dev-Server leitet ohnehin alles auf `index.html`. Vercel tut das nur, wenn man
es konfiguriert.

**Lösung:** `apps/webapp/vercel.json` mit `rewrites` (nicht `redirects`) auf `/index.html`.
Vercel liefert statische Dateien **vor** den Rewrites aus, der Catch-all verdeckt
`/assets/*` also nicht — das nicht mit einem Negative-Lookahead „reparieren".

## `tsc` scheitert auf einem frischen Clone an `LayoutProps`

**Symptom:** „Cannot find name 'LayoutProps'" in `apps/marketing/app/layout.tsx`,
obwohl der Code unverändert ist.

Next 16 erzeugt diese Typen erst in `.next/types`, also beim Build oder per `next
typegen`. Vor dem ersten Build existieren sie nicht.

**Lösung:** Marketings `typecheck` ist `next typegen && tsc --noEmit`. Die Reihenfolge
gehört ins Script, nicht in eine Notiz. Alternativ Nexts globale Typen gar nicht
verwenden — `RootLayout` typt seine `children` deshalb explizit.

## `??` fängt die leere Env-Variable nicht

_Passiert 2026-08-27, beim allerersten Vercel-Build._

**Symptom:** Der Marketing-Build bricht in Vercel ab mit
`TypeError: Invalid URL … input: ''` an `new URL(SITE_URL)` in `app/layout.tsx`.
Lokal baut dasselbe Commit sauber.

`SITE_URL` stand als `process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bautakt.com'`
da. Nullish-Coalescing greift aber nur bei `null` und `undefined` — **nicht beim
leeren String**. Eine im Vercel-Dashboard angelegte, aber nicht befüllte Variable
liefert genau den. Lokal existierte die Variable gar nicht, dort griff der
Fallback also korrekt: der Fehler ist deshalb nur in Vercel sichtbar.

**Lösung:** Env-Werte nie mit `??` absichern. Leer wie fehlend behandeln:

```ts
const trimmed = value?.trim();
return trimmed ? trimmed : fallback;
```

Wo es keinen sinnvollen Standard gibt — `VITE_SUPABASE_URL` etwa —, gehört kein
Fallback hin. Früher warf `requireEnv` im Modulkopf von `apps/webapp/src/lib/supabase.ts`
beim Import. Das Deploy war grün, die Seite weiß: der `throw` lief, bevor React
mountete, und die Console-Meldung sah niemand. Seit 2026-09 liefert
`supabaseBootError` die Meldung, und `main.tsx` rendert eine BootError-Seite
statt der App. Der Client entsteht nur, wenn die Werte stehen; ein Zugriff trotz
Fehler wirft weiterhin — aber mit UI davor.

⚠️ Beim Refactoring darauf achten, dass `process.env.NEXT_PUBLIC_*` bzw.
`import.meta.env.VITE_*` **wörtlich** an der Aufrufstelle stehen bleibt. Beide
Bundler ersetzen diesen Ausdruck statisch; ein dynamischer Zugriff über
`process.env[name]` bliebe im Bundle leer. Als Funktions*argument* funktioniert
die Ersetzung — das wurde für beide Apps am gebauten Bundle nachgeprüft, nicht
am Quelltext.

## Weisse Produktionsseite ohne sichtbaren Fehler

_Festgestellt 2026-09, bautakt-webapp Production._

**Symptom:** `https://app.bautakt.com` (oder der Vercel-Alias) liefert eine weisse
Seite. Kein React-Baum, oft nur ein ungelesener Console-Fehler.

`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` fehlten oder waren leer **zur
Build-Zeit**. Vite hatte `undefined` bzw. `''` inline. Der frühere
`requireEnv`-Throw im Import von `supabase.ts` stoppte den Start, bevor
`createRoot(...).render` lief.

**Lösung (Code):** Kein Throw im Modulkopf. `supabaseBootError` + BootError-Seite
in `main.tsx`. **Lösung (Ops):** Variablen im Vercel-Projekt `bautakt-webapp`
setzen und **neu deployen** — siehe [deployment-vercel.md](deployment-vercel.md).

## Das Dev-Deployment landet bei Google

**Symptom:** `bautakt-marketing.vercel.app` taucht in der Suche auf — mit
Platzhalter-Preisen und halbfertigen Texten. Später konkurriert es mit der echten
Domain um dieselben Inhalte.

Ein Vercel-**Production**-Deployment ist auch ohne Custom Domain öffentlich und
crawlbar. Nur _Preview_-Deployments bekommen automatisch `X-Robots-Tag: noindex`. Das
ist der Unterschied, den man leicht überliest: „kein eigener Domainname" heißt nicht
„nicht auffindbar".

**Lösung:** Drei Code-Ebenen, siehe [deployment-vercel.md](deployment-vercel.md). Im
Code gibt `IS_PRODUCTION_SITE` nur bei ausdrücklich auf `bautakt.com` gesetzter
`NEXT_PUBLIC_SITE_URL` frei; alles andere liefert `Disallow: /`, Meta-`noindex` **und**
`X-Robots-Tag`. Vercel Authentication zusätzlich, wo der Plan Production Protection
zulässt — Hobby kann Production nicht dahinter legen.

⚠️ `Disallow` in der `robots.txt` ist **kein** `noindex`. Es verhindert das Crawlen,
nicht das Indexieren einer von woanders verlinkten URL. Meta und Header decken das ab;
die Prüfung des einen ersetzt die der anderen nicht.

Die Freigabe hängt bewusst an der **rohen** Umgebungsvariablen, nicht an `SITE_URL`.
`SITE_URL` fällt pre-go-live auf den `.vercel.app`-Alias zurück (nicht auf
`bautakt.com`, damit Canonicals nicht auf die IONOS-Parking-Seite zeigen). Wäre die
Gate an `SITE_URL` gekoppelt, würde der Fallback die Freigabe steuern — die Absicht
ist das Gegenteil: nur die explizit auf `bautakt.com` gesetzte Roh-Env gibt frei.

## Env-Änderung in Vercel wirkt nicht

**Symptom:** Der Wert von `VITE_SUPABASE_URL` wurde in Vercel geändert, die App nutzt
weiter den alten.

Vite ersetzt `import.meta.env.VITE_*` zur **Build**-Zeit durch den Literalwert.

**Lösung:** Redeploy, nicht Neustart.

## Die Supabase-CLI legt ein `supabase/` im Repo an

_Passiert 2026-08-26, war bereits in einem Commit._

**Symptom:** Nach `npx supabase gen types` existiert `supabase/.temp/` im Repo-Root —
genau der Ordner, den die AGENTS.md-Regel hier verbietet.

**Lösung:** `/supabase/` steht in der `.gitignore`. Das Schema gehört `bautakt-app`;
dieses Repo liest nur.

## Überzahlung sieht aus wie „Offen: 0,00 €“

_Festgestellt 2026-10-05 an RE00002 (Spahrbau): 20.000 € gezahlt bei 13.452,95 €
Brutto, Status `paid`._

**Symptom:** Die Rechnung zeigt „Bezahlt“ und „Offen: 0,00 €“, obwohl die
Zahlungszeile deutlich über dem Brutto liegt. Kein Hinweis, dass zu viel
eingegangen ist.

`update_document_payment_status` setzt `paid`, sobald `gezahlt >= brutto`. Die
Detailseite klemmte den Rest mit `Math.max(0, brutto − gezahlt)` und zeigte
diese 0 als offenen Betrag. Exakte Vollzahlung und Überzahlung sahen gleich aus.

**Lösung:** `openMinorOf` bleibt die geklemmte Forderung (Button, „Offen“ bei
Teil- und Vollzahlung). `overpaidMinorOf` ist der Überschuss und ersetzt auf
der Detailseite die Null-Anzeige. Den Status in der Datenbank nicht anfassen —
ein `overpaid` wäre eine Schemaänderung in `bautakt-app`.

## `employments.company_id` und `.role` sind nullable

**Symptom:** Leere Listen, obwohl Daten vorhanden sind — die Abfrage filtert effektiv
auf `company_id=is.null`.

Im Schema sind `company_id`, `role` und `user_id` in `employments` nullable. Wer die
generierten Types mit `!` oder einem Cast wegdrückt, baut sich das ein.

**Lösung:** Eine Zeile ohne Betrieb oder Rolle ist keine brauchbare Mitgliedschaft.
`useMembership` liefert dafür `null`.

## `eslint-plugin-react-hooks` 7.1.1: `recommended-latest` ist nicht flat

**Symptom:** ESLint bricht ab mit „Flat config requires 'plugins' to be an object".

Trotz des Namens ist `configs['recommended-latest']` in 7.1.1 noch eslintrc-geformt
(`plugins` ist ein Array).

**Lösung:** Die Flat-Variante liegt unter `configs.flat['recommended-latest']`.

## 22 Tabellen vergeben ihre `id` nicht selbst

_Gefunden 2026-09-23 beim Kundenformular im Web._

**Symptom:** `insert` schlägt fehl, weil `id` fehlt — obwohl es bei anderen Tabellen
ohne `id` funktioniert. Die generierten Types sagen es ebenfalls: `id` ist dort im
`Insert`-Typ Pflicht statt optional.

Das ist kein Versehen, sondern Folge des Offline-First-Ansatzes der Handy-App: diese
Datensätze entstehen ohne Verbindung und tragen ihre Id schon vor dem Sync. Betroffen
sind durchweg die Tabellen, in die das Handy auf der Baustelle schreibt.

_Stand 2026-09-24, 22 Tabellen ohne `DEFAULT gen_random_uuid()`:_ `absences`,
`articles`, `calendar_events`, `checklist_items`, `checklists`, `cost_centers`,
`customers`, `daily_reports`, `notes`, `notifications`, `order_document_categories`,
`order_documents`, `order_images`, `order_issue_attachments`, `order_issues`,
`order_materials`, `order_notes`, `orders`, `personal_notes`, `profiles`,
`time_entries`, `work_assignments`.

Die Finanztabellen (`sales_documents`, `sales_document_lines`, `payments`,
`dunning_notices`, `expenses`, `incoming_invoices`) und `employments` haben dagegen
ein Default.

**Prüfen statt raten** — die Liste veraltet:

```sql
select c.table_name from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name
 and t.table_type = 'BASE TABLE'
where c.table_schema = 'public' and c.column_name = 'id' and c.column_default is null
order by c.table_name;
```

**Lösung:** Beim Anlegen `id: crypto.randomUUID()` mitgeben. **Nicht** in der
Datenbank ein Default nachrüsten — das wäre eine Schemaänderung, und die gehört
ohnehin nach `bautakt-app`.

## Bearbeiten einer Notiz setzt den Autor neu

_Festgestellt 2026-10-08, Issue #47._

**Symptom:** Nach dem Speichern steht ein anderer Name unter der Notiz,
`created_at` springt, oder die Notiz hängt an einem anderen Auftrag.

`order_notes` hat als Inhalt nur `title` und `body`. Ein Update, das
`user_id`, `created_at`, `company_id` oder `order_id` mitschickt,
überschreibt sie. Die Handy-App synchronisiert Last-Write-Wins aus ihrem
Cache und schreibt diese Felder wieder mit. Die Datenbank prüft den Autor
seit der Migration `order_notes_shared_and_view_permission` (2026-08-11)
nicht mehr: Insert, Update und Delete verlangen nur `canCreateNotes`.

**Lösung:** Beim Anlegen `id: crypto.randomUUID()`, `user_id` des
angemeldeten Nutzers, `created_at` und `modified_at` setzen. Beim Bearbeiten
nur `title`, `body` und `modified_at`. Siehe
[auftragsnotizen.md](auftragsnotizen.md).

## Druckansicht bleibt bei fehlendem Beleg im Spinner

_Behoben 2026-10-05, Issue #35._

**Symptom:** `/rechnungen/<id>/druck` mit fehlender, unbekannter oder ungültiger
Beleg-Id zeigt endlos den Ladekreis. Eine gültige Id druckt weiter.

`InvoicePrintPage` behandelte `!data` wie „noch am Laden“. `useSalesDocument`
liefert bei unbekannter Id `null` (`maybeSingle`, Erfolg ohne Zeile) und bei
einer Nicht-UUID einen Fehler. Beides ist ein Endzustand, `data` bleibt leer.
Fehlt die Id ganz, ist die Abfrage `enabled: false`; TanStack Query v5 hält
`isPending` dann dauerhaft wahr, und `useCompanyListLoading` meldet ebenfalls
endloses Laden. Die Detailseite trennt das schon: Spinner nur bei `isPending`,
danach Fehler oder „Beleg nicht gefunden“.

**Lösung:** Spinner nur, solange eine Id da ist und die Abfrage noch pending
ist. Danach dieselben Texte wie `InvoiceDetailPage`, mit Rückweg auf
`/rechnungen`. Die Briefkopf-Abfrage bleibt parallel und hält die Seite nicht
fest.

## Einsatz löschen nimmt die Zeiten mit

_Festgestellt 2026-10-05, beim Löschen in der Web-App. Issue #43._

**Symptom:** Nach dem Löschen eines Einsatzes fehlen die Arbeitszeiten, die
daran hingen. Sie sind nicht verwaist, sie sind weg.

`time_entries.work_assignment_id` verweist mit `ON DELETE CASCADE` auf
`work_assignments` (gemessen 2026-10-05). RLS auf `time_entries` ist nicht
`FORCE`. Die Kaskade läuft deshalb nicht als der angemeldete Nutzer und löscht
auch Zeilen, die seine Select-Policy nicht zeigt.

**Lösung:** Die Web-App löscht nur, wenn das Konto alle Zeiten des Betriebs
sehen kann (`canTrackTimeForTeam`, `canViewWageCosts` oder
`canViewCompanyFinance`) und für diesen Einsatz keine Zeile zählt. Sonst bleibt
der Einsatz stehen und der Dialog sagt, warum. Die Zeilen in
`work_assignment_employees` fallen mit — das ist die Zuordnung, keine Buchung.
Siehe [einsatz-anlegen.md](einsatz-anlegen.md).

## Kostenstelle löschen löst die Auftragszuordnung

_Gefunden 2026-10-05, Issue #42._

**Symptom:** Eine gelöschte Kostenstelle verschwindet, die Aufträge bleiben —
aber `cost_center_id` ist `null`. Die Bezeichnung in `cost_center_label` steht
weiter da, ohne dass noch eine Kostenstelle dazu gehört.

`orders.cost_center_id` verweist mit `ON DELETE SET NULL`. Die Datenbank
verhindert das Löschen nicht.

**Lösung:** Die Liste löscht nur, wenn eine frische Zählung der verknüpften
Aufträge 0 ergibt, und erklärt sonst, warum die Zeile bleibt. Die Prüfung und
das `delete` sind zwei Anfragen; ein Auftrag, der genau dazwischen verknüpft
wird, kann noch genullt werden. Das schlösse erst `ON DELETE RESTRICT` in
`bautakt-app`. Siehe [kostenstellen.md](kostenstellen.md).

## Zeiteintrag ohne Nutzer oder ohne Satz

_Gemessen 2026-10-08, Issue #46._

**Symptom:** Ein Insert in `time_entries` aus dem Web scheitert für Konten, die
nur `canTrackTime` haben, oder er landet mit `cost_rate` und `billing_rate`
NULL. Die Rechnung aus Zeiten hat dann keinen Preis. Der Cache der Liste bleibt
trotzdem stehen, weil die Mutation `['time-entries', companyId]` invalidiert
hat und die Abfrage `['timeEntries', companyId, …]` heißt.

Die Insert-Policy verlangt für die eigene Erfassung `user_id = auth.uid()`.
Die Handy-App setzt `user_id` auf den Nutzer der gewählten Anstellung. Der
Trigger `trg_time_entries_billing_fields` löst die Sätze beim INSERT nur auf,
wenn das Konto **kein** `canManageRates` hat. Mit dem Recht bleibt der Wert des
Clients, einschließlich NULL.

`resolve_labor_rate` ist `SECURITY DEFINER` und für `authenticated` nicht
ausführbar (gemessen 2026-10-08). Sie prüft die Mitgliedschaft nicht. Ein Grant
wäre das alte mandantenübergreifende Leck wieder. Nicht freischalten.

**Lösung:** `user_id` aus der Anstellung mitgeben. Sätze nur mit
`canManageRates` selbst aus `labor_rates` auflösen (Auftrag, Anstellung, Rolle,
Betrieb, jüngster gültiger Satz, sonst 0). Ohne das Recht die Spalten
weglassen, der Trigger füllt sie. Invalidieren unter `timeEntries`. Siehe
[auftragszeiten.md](auftragszeiten.md).

Abgerechnete Zeilen (`billed_document_id`) sperrt die Datenbank nicht. Die
Oberfläche lehnt Ändern und Löschen ab und liest die Spalte direkt vor dem
Schreiben noch einmal. Eine echte Sperre wäre ein Trigger in `bautakt-app`.

## Auftragsfoto: der Bucket nimmt nur JPEG bis 5 MB

_Gemessen 2026-10-08, Issue #48._

**Symptom:** Ein Upload schlägt fehl, obwohl die Datei ein Bild ist. Die
Meldung kommt von Storage, nicht von `order_images`.

Der Bucket `order-images` ist privat. `file_size_limit` ist 5242880,
`allowed_mime_types` ist nur `image/jpeg`. Ein PNG oder HEIC direkt in den
Bucket läuft dagegen. `order_images.id` hat kein Default.

**Lösung:** Im Browser nach JPEG wandeln, breiter als 1920 Pixel auf 1920
bringen, unter 5 MB bleiben, `id` mit `crypto.randomUUID()` setzen. Pfad
`{companyId}/{orderId}/{imageId}.jpg`. Siehe
[auftragsfotos.md](auftragsfotos.md).

## Foto löschen: erst die Datei, dann die Zeile

_Festgelegt 2026-10-08, Issue #48._

**Symptom:** Die Zeile ist weg, die Datei liegt noch im Bucket. Oder die
Galerie zeigt einen Fehler, obwohl der Löschdialog noch offen ist.

Die Handy-App entfernt bei `order_image.delete` zuerst das Storage-Objekt und
toleriert „Object not found“, danach die Zeile. Macht man es umgekehrt und
die Datei bleibt liegen, hat die Oberfläche den Pfad verloren. Ein
verweigertes Storage-Delete kommt außerdem nicht immer als Fehler zurück; die
Policy filtert das Objekt aus der Antwort. Deshalb erst löschen, dann mit
HEAD nachsehen, und die Zeile nur entfernen, wenn die Datei weg ist.

Beim Anlegen ist die Reihenfolge die andere: erst Upload, dann Insert.
Schlägt das Insert fehl, wird das Objekt entfernt. Sonst sieht die Handy-App
eine Datei nicht, die niemand in `order_images` findet.

**Nicht aufräumen, was schon liegt.** _Stand 2026-10-08: 49 Objekte im
Bucket, 10 Zeilen, 10 davon verknüpft._ `order_images.order_id` verweist mit
`ON DELETE CASCADE` auf `orders`. Die Datei im Bucket fällt dabei nicht mit.
Das gehört nach `bautakt-app`, nicht in eine Web-Migration.
