# Auth im Web

Die gesamte Anmeldung lebt in `apps/webapp`. Die Marketing-Seite hat keinen
Supabase-Client und verlinkt nur auf `app.bautakt.com/login` — damit entfällt jede
Cross-Domain-Sitzung.

## Client

`packages/supabase/src/client.ts`. Drei bewusste Abweichungen von
`bautakt-app/app/lib/supabase/supabase.ts`:

| Hier                       | Dort                                          | Warum                                                                                                  |
| -------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `detectSessionInUrl: true` | `false`                                       | Sonst lösen Recovery- und Bestätigungslinks, die auf `app.bautakt.com` landen, ihre Sitzung nicht ein. |
| kein `processLock`         | `processLock`                                 | React-Native-spezifisch; im Browser nutzt supabase-js `navigator.locks`.                               |
| kein AppState-Wiring       | `AppState`-Listener für start/stopAutoRefresh | Es gibt kein AppState.                                                                                 |

`createBautaktClient(url, anonKey)` nimmt seine Werte als **Argumente** und liest nie
selbst aus der Umgebung — dasselbe Wertepaar heißt je nach Konsument `VITE_*`,
`NEXT_PUBLIC_*` oder `EXPO_PUBLIC_*`.

## Sitzung

`AuthProvider` liest einmal `getSession()` **und** abonniert `onAuthStateChange`.

`bautakt-app` tut Letzteres nicht. Daraus folgt dort der Umweg beim Passwort-Reset: nach
`verifyOtp` wird ausgeloggt, weil der Provider die neue Sitzung sonst nie sieht. Hier
ist das nicht nötig.

Die drei Fallstricke des Musters — `initializing`, kein `await` im Callback,
`queryClient.clear()` beim Abmelden — stehen ausführlich in
[fallstricke.md](fallstricke.md) und sind im Modulkopf des Providers dokumentiert.

## Guards

`ProtectedRoute` und `PublicOnlyRoute` sind **Komponenten, keine Route-Loader**. Loader
laufen außerhalb von React und kommen an den Provider-Context nicht heran; ein
Loader-Guard müsste bei jeder Navigation erneut `getSession()` aufrufen.

`ProtectedRoute` merkt sich das Ziel in `location.state.from`, damit nach der Anmeldung
dorthin zurückgekehrt werden kann.

`/impressum` und `/datenschutz` hängen an keinem der beiden Guards
(`router.tsx`, Geschwister von `PublicOnlyRoute` und `ProtectedRoute`). Ohne
Sitzung gibt es keinen Sprung zum Login, mit Sitzung keinen Sprung in die
Übersicht. Zurück auf der Seite führt ohne Sitzung nach `/login`, mit Sitzung
nach `HOME_ROUTE`.

## Passwort-Reset

Anders als in der Mobile-App über einen echten Link, nicht per OTP:

1. `/passwort-vergessen` ruft `resetPasswordForEmail` mit `redirectTo` auf
   `/passwort-zuruecksetzen`.
2. Der Link trägt die Recovery-Sitzung im URL-Fragment; supabase-js löst sie ein, weil
   `detectSessionInUrl: true` gesetzt ist.
3. `/passwort-zuruecksetzen` liegt bewusst **außerhalb** von `PublicOnlyRoute` — sonst
   würde die mitgebrachte Sitzung die Seite sofort wegleiten.
4. Nach `updateUser` wird abgemeldet und auf `/login` geleitet. Die Recovery-Sitzung ist
   eine Sonderform; der reguläre Weg soll über das neue Passwort gehen.

⚠️ Damit Schritt 2 in Produktion funktioniert, muss `https://app.bautakt.com/**` in der
Redirect-Allowlist von Supabase stehen. Siehe
[deployment-vercel.md](deployment-vercel.md).

## Fehlermeldungen

`authErrors.ts` bildet Supabase-Fehler auf i18n-Keys ab — über `error.code`, **nicht**
über die englische `error.message`. Die Meldungstexte sind nicht Teil der API-Zusage und
ändern sich zwischen Versionen.

Eine Ausnahme, Stand 09.10.2026: `signup_disabled`. GoTrue schickt diesen Code als
`AuthApiError` mit dem festen Satz „Signups not allowed for this instance“ (HTTP 422,
ältere Instanzen auch 400). Fehlt der Code, zählt dieser Satz trotzdem — aber nur, wenn
kein anderer Code gesetzt ist. Der Schlüssel ist `errors:auth.signupDisabled`. Die
Registrierseite zeigt ihn über `FormError` (`role="alert"`), dieselbe Komponente wie die
übrigen Auth-Formulare.

`/passwort-vergessen` bestätigt bewusst auch dann, wenn kein Konto existiert. Ob es zu
einer Adresse ein Konto gibt, darf die Seite nicht verraten. Nur Rate-Limit-Fehler
werden gezeigt.

## Registrierung

Öffentliche Registrierung war in Supabase Auth vom 09.10.2026 an abgeschaltet und
ist inzwischen wieder offen: am 30.10.2026 entstanden Konten über `/registrieren`,
sofort bestätigt (gemessen an `auth.users`). Seit 30.10.2026 verlinkt die
Login-Seite wieder „Noch kein Konto? Registrieren“ (`auth:signIn.noAccount`,
Owner-Wunsch). Das Formular wird nicht vorab gesperrt; ist die Registrierung aus,
übersetzt die Seite die Antwort von `supabase.auth.signUp`
(`errors:auth.signupDisabled`).

`signUp` in `AuthProvider` wird nur von `RegisterPage` benutzt. Die Seite fragt
wie `sign-up.tsx` der App Vorname, Nachname, Geburtsdatum, E-Mail und Passwort ab
(seit 30.10.2026). Name und Geburtsdatum gehen als `options.data` in die
`user_metadata`: Mit E-Mail-Bestätigung gibt es nach `signUp` keine Sitzung, und
`handle_new_user` legt `profiles` nur mit `NULL`-Namen an (gemessen am 30.10.2026
am Trigger `on_auth_user_created`). `/betrieb-einrichten` schreibt die Werte nach
der ersten Anmeldung nach `profiles`. Eine leere `identities`-Liste in der Antwort
heißt „Adresse schon registriert“ und wird als `errors:auth.userAlreadyExists`
gemeldet — Supabase liefert dafür bei aktiver Bestätigung keinen Fehler.

Mitarbeiter-Einladungen erzeugen keinen Auth-Benutzer:
`accept_employment_invitation(p_token)` verlangt `auth.uid()` und legt nur die
Beschäftigung an (SECURITY DEFINER, `authenticated` ja, `anon` nein — gemessen
30.10.2026 mit `has_function_privilege`). Die Web-App ruft sie auf
`/betrieb-einrichten` auf, nachdem sich der neue Nutzer registriert und angemeldet
hat.

## Betrieb einrichten

Ein angemeldeter Nutzer ohne Beschäftigung landet auf `/betrieb-einrichten`
(`MembershipGate`), nicht in der Shell. Die Query muss fertig sein, bevor
umgeleitet wird — sonst sieht ein Reload kurz keine Mitgliedschaft. Ein Fehler
der Query ist kein leeres Ergebnis: die Seite zeigt „Erneut versuchen“, legt
aber keine Firma an.

Die Seite ist ein Assistent nach dem Weg der App (`app/index.tsx`,
`role.tsx`, `company-*.tsx`, `join-company.tsx`, `welcome-team.tsx`),
`features/company/pages/CompanySetupPage.tsx`:

1. **Über mich** — nur, wenn `profiles` und `user_metadata` zusammen keinen
   Vornamen, Nachnamen und kein gültiges Geburtsdatum ergeben (Konten von vor
   dem 30.10.2026 oder aus der App). Regeln wie `validateBirthDate` der App.
2. **Gründen oder beitreten** (`RoleChoice`). Die Wahl steuert nur den Weg; die
   Rolle entsteht über `employments`.
3. **Chef:** Betriebsname (≥ 2 Zeichen), Gewerk (Liste oder eigener Text
   ≥ 2 Zeichen), Teamgröße `solo` / `small` / `medium` / `large` — dann die
   **Anschrift** (Straße ≥ 5, PLZ 5 bzw. 4 Ziffern je Land, Ort ≥ 2, Land
   `DE`/`AT`/`CH`) mit denselben Regeln wie die Karte „Betrieb“ unter
   Einrichtung. Telefon und E-Mail liegen unter „Weitere Angaben (optional)“
   und werden nur geprüft, wenn sie gefüllt sind. Hier weicht das Web bewusst
   von der App ab, die die Anschrift erst über die Einrichtungs-Checkliste
   holt: ohne Anschrift lässt sich keine Rechnung stellen (Owner-Wunsch
   30.10.2026).
   Angelegt wird wie `createCompany` mit `setAsPrimary: true`: Firma,
   bisherige primäre Beschäftigung zurücksetzen, Beschäftigung mit Rolle
   `Geschäftsführer`. Seed-RPCs ruft die Oberfläche nicht auf; das tun die
   Trigger auf `companies`. Ein zweiter Versuch nach einem Fehler hinter dem
   Firmen-Insert legt keine zweite Firma an (`createdCompanyId`).
   **Mitarbeiter:** Einladungscode (16 Zeichen, Leerzeichen und Bindestriche
   egal) oder QR-Code. Erkennung wie `extractInviteToken` der App
   (`features/company/invitations.ts`, mit Test); der QR der App trägt
   `bautakt://invite/<token>`. `InviteQrDialog` liest die Kamera über
   `getUserMedia` und dekodiert mit `jsqr`; ohne Kamera bleibt „Foto
   hochladen“. Fehlercodes der RPC werden über `errors:invitation.*` übersetzt.
4. **Willkommen** — „… ist startklar!“ bzw. „Willkommen bei …“.

Vor Firma oder Beitritt schreibt die Seite Name und Geburtsdatum nach
`profiles`, falls sie dort fehlen — die RPC lehnt sonst mit `NAME_REQUIRED` ab.
Danach setzt sie `profiles.onboarding_complete` (in der App der
Willkommensscreen). ⚠️ Die Mitgliedschafts-Query wird erst auf „Los geht's“
invalidiert; sonst sähe `MembershipGate` den Betrieb sofort und spränge an der
Willkommensseite vorbei. Mit Betrieb ist `/betrieb-einrichten` gesperrt und
führt auf die Übersicht.

Profilfoto und Sprachwahl gibt es im Web nicht.
