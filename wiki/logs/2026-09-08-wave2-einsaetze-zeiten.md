# 2026-09-08 — Wave 2 Demo: Einsätze und Zeiten (read-first)

Read-first-Ansichten für die GF-Demo am 10.10.2026.

## Was geändert wurde

- Einsätze (`/einsaetze`): Live-Liste aus `work_assignments` inkl. Auftragstitel und
  zugewiesener Mitarbeiter (`work_assignment_employees` → `employments`/`profiles`),
  Wochenfilter `?zeitraum=woche`, schlankes Detail wie Aufträge.
- Zeiten (`/zeiten`): Live-Liste aus `time_entries` mit Mitarbeiter, Auftrag, Beginn,
  Ende, Pause, Nettodauer und Notiz. Read-only, neueste zuerst.
- Übersicht/Rechnungen/Einstellungen bleiben Platzhalter. Keine Schreib-Flows, kein
  Kalender-Grid, keine `calendar_events` in der Liste.

## Warum

Wave 1 hatte Shell, Aufträge und Kunden. Die Demo braucht sichtbare Einsätze und
Zeiten gegen echte Testdaten, ohne die Mobile-Write-Komplexität zu portieren.

## Verweise

- [webapp-shell.md](../pages/webapp-shell.md)
- Code: `apps/webapp/src/features/assignments/`, `features/times/`
- Schema/RLS: bautakt-app Wiki (nicht hier kopiert)
