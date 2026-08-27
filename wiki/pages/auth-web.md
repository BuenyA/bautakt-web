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

`/passwort-vergessen` bestätigt bewusst auch dann, wenn kein Konto existiert. Ob es zu
einer Adresse ein Konto gibt, darf die Seite nicht verraten. Nur Rate-Limit-Fehler
werden gezeigt.
