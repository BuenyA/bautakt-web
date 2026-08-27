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
Fallback hin, sondern ein `throw` mit lesbarer Meldung. Sonst scheitert
supabase-js tief im Inneren, das Deploy ist grün und die Seite weiß.

⚠️ Beim Refactoring darauf achten, dass `process.env.NEXT_PUBLIC_*` bzw.
`import.meta.env.VITE_*` **wörtlich** an der Aufrufstelle stehen bleibt. Beide
Bundler ersetzen diesen Ausdruck statisch; ein dynamischer Zugriff über
`process.env[name]` bliebe im Bundle leer. Als Funktions*argument* funktioniert
die Ersetzung — das wurde für beide Apps am gebauten Bundle nachgeprüft, nicht
am Quelltext.

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
