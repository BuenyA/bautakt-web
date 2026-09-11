-- Demo-Seed: Spahrbau GmbH — Einsätze in die Demo-Wochen schieben
-- ----------------------------------------------------------------------
-- Zweck: Für die GF-Demo (10.10.2026) und den Wochenfilter „Diese Woche“
--        ein paar bestehende work_assignments zeitlich verschieben.
--
-- Betrieb: Spahrbau GmbH
-- company_id: 1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c
--
-- Kein Schema-Seed, keine INSERTs. Nur UPDATEs auf bekannte Testdaten-IDs.
-- Idempotent-ish: gleiche Zielzeiten bei erneutholtem Lauf.
-- Dauer bleibt ~9–11 h (wie in den Originalzeilen).
--
-- Zeitzone: Europe/Berlin (lokale Wanduhr → timestamptz).
-- Aktuelle Woche: ISO-Woche ab Montag relativ zu now() in Berlin.
-- GF-Woche: Mo 2026-10-05 bis So 2026-10-11 (Demo-Tag Fr 10.10.2026).
--
-- Ausführen (Supabase SQL Editor oder psql gegen das Shared-Projekt),
-- nicht über supabase db push / Migrationen.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Aktuelle lokale Woche (Europe/Berlin) — drei Einsätze
--    Mo 07:00–16:00, Mi 07:00–16:00, Fr 07:00–16:00 (je 9 h)
-- ---------------------------------------------------------------------------
WITH berlin_week AS (
  SELECT date_trunc('week', now() AT TIME ZONE 'Europe/Berlin') AS week_start
)
UPDATE work_assignments wa
SET
  starts_at = timezone('Europe/Berlin', bw.week_start + interval '0 days 7 hours'),
  ends_at   = timezone('Europe/Berlin', bw.week_start + interval '0 days 16 hours')
FROM berlin_week bw
WHERE wa.company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
  AND wa.id = '8a76c470-d18a-4277-b078-9cd66ca6c885';

WITH berlin_week AS (
  SELECT date_trunc('week', now() AT TIME ZONE 'Europe/Berlin') AS week_start
)
UPDATE work_assignments wa
SET
  starts_at = timezone('Europe/Berlin', bw.week_start + interval '2 days 7 hours'),
  ends_at   = timezone('Europe/Berlin', bw.week_start + interval '2 days 16 hours')
FROM berlin_week bw
WHERE wa.company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
  AND wa.id = '2e9af52c-1502-4780-9d1e-7395969e9a0c';

WITH berlin_week AS (
  SELECT date_trunc('week', now() AT TIME ZONE 'Europe/Berlin') AS week_start
)
UPDATE work_assignments wa
SET
  starts_at = timezone('Europe/Berlin', bw.week_start + interval '4 days 7 hours'),
  ends_at   = timezone('Europe/Berlin', bw.week_start + interval '4 days 16 hours')
FROM berlin_week bw
WHERE wa.company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
  AND wa.id = '7f82bc48-fc90-4933-80b9-2166edf9c960';

-- ---------------------------------------------------------------------------
-- 2) GF-Woche 2026-10-05 … 2026-10-11 — vier Einsätze inkl. Demo-Tag 10.10.
-- ---------------------------------------------------------------------------

-- Mo 05.10. — 10 h (06:00–16:00 Berlin), Originaldauer eef6824b
UPDATE work_assignments
SET
  starts_at = timezone('Europe/Berlin', timestamp '2026-10-05 06:00:00'),
  ends_at   = timezone('Europe/Berlin', timestamp '2026-10-05 16:00:00')
WHERE company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
  AND id = 'eef6824b-9471-4693-874e-bfbfd5ad527b';

-- Di 06.10. — 9 h
UPDATE work_assignments
SET
  starts_at = timezone('Europe/Berlin', timestamp '2026-10-06 07:00:00'),
  ends_at   = timezone('Europe/Berlin', timestamp '2026-10-06 16:00:00')
WHERE company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
  AND id = '14f82be6-36d5-4285-88e6-2e3478893b0d';

-- Mi 07.10. — 9 h
UPDATE work_assignments
SET
  starts_at = timezone('Europe/Berlin', timestamp '2026-10-07 07:00:00'),
  ends_at   = timezone('Europe/Berlin', timestamp '2026-10-07 16:00:00')
WHERE company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
  AND id = '89a0223f-9882-4618-bfea-9d4a0fb85fa4';

-- Fr 10.10. (GF-Tag) — 11 h (06:00–17:00 Berlin), Originaldauer ec97b5ee
UPDATE work_assignments
SET
  starts_at = timezone('Europe/Berlin', timestamp '2026-10-10 06:00:00'),
  ends_at   = timezone('Europe/Berlin', timestamp '2026-10-10 17:00:00')
WHERE company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
  AND id = 'ec97b5ee-b70f-40a0-b1d9-03d9fbba2271';

-- ---------------------------------------------------------------------------
-- 3) Optional: zugehörige time_entries auf denselben Tag/Zeitraum ziehen
--    (nur Zeilen mit work_assignment_id; FK bleibt erhalten)
-- ---------------------------------------------------------------------------
UPDATE time_entries te
SET
  started_at = wa.starts_at,
  ended_at = CASE
    WHEN te.ended_at IS NULL THEN NULL
    ELSE wa.ends_at
  END,
  modified_at = now()
FROM work_assignments wa
WHERE te.work_assignment_id = wa.id
  AND wa.company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
  AND wa.id IN (
    '8a76c470-d18a-4277-b078-9cd66ca6c885',
    '2e9af52c-1502-4780-9d1e-7395969e9a0c',
    '7f82bc48-fc90-4933-80b9-2166edf9c960',
    'eef6824b-9471-4693-874e-bfbfd5ad527b',
    '14f82be6-36d5-4285-88e6-2e3478893b0d',
    '89a0223f-9882-4618-bfea-9d4a0fb85fa4',
    'ec97b5ee-b70f-40a0-b1d9-03d9fbba2271'
  );

-- Unberührt (historische Testdaten, weiterhin unter „Alle“ sichtbar):
--   23f6d875-8bba-4f9a-9222-e0e9fc0dfb02
--   f2f55347-e4e8-4b96-8877-46a39d63c07e
--   403e2a8b-2f00-430c-9cb4-1ee18234e60e

COMMIT;

-- Kurz-Check (optional, nach dem Commit):
-- SELECT id, starts_at AT TIME ZONE 'Europe/Berlin' AS starts_berlin,
--        ends_at AT TIME ZONE 'Europe/Berlin' AS ends_berlin
-- FROM work_assignments
-- WHERE company_id = '1e7f6b6c-0b4e-479c-ac13-f6c6f9c6215c'
-- ORDER BY starts_at DESC;
