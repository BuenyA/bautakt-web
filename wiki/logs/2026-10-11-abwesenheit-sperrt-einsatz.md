# 2026-10-11 — Abwesenheit sperrt Einsatzplanung

## Was geändert wurde

- Datenbank (bautakt-app, `20261011211438_work_assignment_absence_conflict`):
  Einteilen und Verschieben bei genehmigter Abwesenheit wirft
  `WORK_ASSIGNMENT_ABSENCE_CONFLICT`. Beide Richtungen rechnen in Ortszeit,
  alle drei Trigger-Funktionen laufen als SECURITY DEFINER.
- Web: Panel markiert Abwesende (gesperrt, rot, gelb), Einsatzseite markiert
  Altfälle, Kalender weist bei eigenen Terminen im Urlaub hin.
- `useUpdateAssignment` trägt erst aus, dann verschiebt es, dann trägt es ein.

## Warum

Bisher gab es die Prüfung nur in eine Richtung (Abwesenheit → Einsatz). Der
Owner wurde nach genehmigtem Urlaub in einen Einsatz desselben Tages
eingeteilt.

## Geprüft

Echte DB, zurückgerollte Transaktion als Geschäftsführer: Einteilen bei
Urlaub → Fehler; bei offenem Antrag → ok; Verschieben in Urlaub → Fehler;
außerhalb → ok; Einsatz 00:30 Ortszeit am Urlaubstag → Fehler; Urlaub auf
Einsatz → Fehler wie bisher; Trigger-Funktion per RPC → permission denied;
Altfall vom 11.10. verschieben → ok.
