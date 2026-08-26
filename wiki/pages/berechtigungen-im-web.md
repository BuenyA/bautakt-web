# Berechtigungen im Web

Das Rechtemodell selbst — die 33 Flags, die sieben Systemrollen, die RLS-Policies und
die `enforce_*`-Trigger — ist im Wiki von `bautakt-app` beschrieben:
<https://github.com/BuenyA/craft/blob/main/wiki/pages/berechtigungen-und-rollen.md>

Diese Seite beschreibt nur, was im Web hinzukommt. **Nicht kopieren, was dort steht.**

## Der eine Satz, der zählt

⚠️ **UI-Gating ist Führung, keine Kontrolle.**

`usePermission('canManageEmployees')` blendet einen Menüpunkt aus. Es hindert niemanden
daran, `/mitarbeiter` in die Adresszeile zu tippen. Die verbindliche Grenze sind die
RLS-Policies (`has_company_permission(company_id, 'canX')`) und die
`enforce_*`-Trigger. Ein verstecktes Element ist keine Zugriffskontrolle.

Praktische Folge für den Test: Es reicht **nicht**, zu prüfen, dass der Menüpunkt fehlt.
Man muss die Adresse von Hand aufrufen und sehen, dass die Datenbank leer zurückgibt.
Erst das ist der Beweis.

## Wie die Rechte im Web zustande kommen

`useMembership` löst sie aus zwei Quellen auf:

1. Standardrechte der Rolle aus `company_roles.permissions`, gefunden über `company_id`
   und `name`.
2. Persönliche Abweichungen aus `employments.permission_overrides`.

Reihenfolge: `DEFAULT_PERMISSIONS`, dann Rollenrechte, dann Overrides. Die Overrides
gewinnen.

`hasPermission` fällt bewusst auf `false` zurück. Ein unbekannter oder fehlender Key
heißt „nicht erlaubt", nie „erlaubt".

⚠️ `employments.company_id` und `.role` sind nullable. Eine Zeile ohne beides ist keine
brauchbare Mitgliedschaft — siehe [fallstricke.md](fallstricke.md).

## Drift-Check

Die Permission-Liste in `packages/core` ist eine Kopie aus `bautakt-app`. Damit sie
prüfbar bleibt, gibt es `packages/core/scripts/check-permission-drift.ts`:

    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run check:permissions -w @bautakt/core

Das Skript liest die Keys aus `system_role_templates.permissions` und schlägt bei
Abweichung fehl. Exitcodes: 0 identisch, 1 Drift, 2 Aufruf- oder Verbindungsfehler.

Der Service-Role-Key gehört **nicht** in eine `.env` dieses Repos — beim Aufruf setzen
oder in CI aus einem Secret ziehen.

_Stand 2026-08-26: 33 Keys in der Datenbank, 33 im Code, keine Abweichung in beide
Richtungen._
