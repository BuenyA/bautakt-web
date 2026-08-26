/**
 * Prueft ALL_PERMISSION_KEYS gegen die Datenbank.
 *
 * Warum es dieses Skript gibt: die Permission-Liste ist eine Kopie aus dem Repo
 * bautakt-app. Kopien driften. Massgeblich ist aber weder dieses Repo noch
 * jenes, sondern Postgres — die Keys leben in der JSONB-Spalte
 * `system_role_templates.permissions` und in `company_roles.permissions`.
 *
 * Damit wird die Duplikation pruefbar statt bloss dokumentiert. Das ist der
 * zweite der drei Saetze aus dem Wiki von bautakt-app: gegen das Ergebnis
 * pruefen, nicht gegen die Konfiguration.
 *
 * Aufruf:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run check:permissions -w @bautakt/core
 *
 * Braucht den Service-Role-Key, weil das Skript keine Nutzersitzung hat und
 * `system_role_templates` unter RLS steht. Der Key gehoert NICHT in eine
 * .env-Datei dieses Repos — er wird beim Aufruf gesetzt oder kommt in CI aus
 * einem Secret.
 *
 * Exitcodes: 0 = identisch, 1 = Drift, 2 = Aufruf-/Verbindungsfehler.
 */

import { createClient } from '@supabase/supabase-js';

import { ALL_PERMISSION_KEYS } from '../src/permissions.ts';

async function main(): Promise<number> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Fehlt: SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY.');
    return 2;
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('system_role_templates').select('permissions');

  if (error) {
    console.error(`Abfrage fehlgeschlagen: ${error.message}`);
    return 2;
  }

  const dbKeys = new Set<string>();
  for (const row of data ?? []) {
    const perms = row.permissions as Record<string, unknown> | null;
    if (perms) for (const key of Object.keys(perms)) dbKeys.add(key);
  }

  const codeKeys = new Set<string>(ALL_PERMISSION_KEYS);
  const onlyInDb = [...dbKeys].filter((k) => !codeKeys.has(k)).sort();
  const onlyInCode = [...codeKeys].filter((k) => !dbKeys.has(k)).sort();

  if (onlyInDb.length === 0 && onlyInCode.length === 0) {
    console.log(`OK — ${codeKeys.size} Permissions, identisch mit der Datenbank.`);
    return 0;
  }

  console.error('DRIFT zwischen @bautakt/core und der Datenbank:');
  if (onlyInDb.length) console.error(`  nur in der DB:  ${onlyInDb.join(', ')}`);
  if (onlyInCode.length) console.error(`  nur im Code:    ${onlyInCode.join(', ')}`);
  console.error('');
  console.error('Quelle der Wahrheit ist die Datenbank. Zuerst bautakt-app angleichen,');
  console.error('dann packages/core/src/permissions.ts.');
  return 1;
}

// exitCode statt process.exit(): ein hartes process.exit() reisst offene Handles
// des Supabase-Clients ab, was unter Windows in einer libuv-Assertion endet.
process.exitCode = await main();
