# 2026-10-08 — Bautagebuch am Auftrag

Die Auftragsdetailseite liest `daily_reports` und legt Berichte an, ändert
sie und löscht sie. Dieselbe Tabelle schreibt die Handy-App.

## Was geändert wurde

- Block „Bautagebuch“ unter dem Material auf `/auftraege/:id`. Karte mit
  Datum, Wetter, Temperatur, Anwesenheit, Leistungen und Notizen. Anzahlen
  verknüpfter Zeiten, Materialien, Fotos und Mängel, soweit die Abfrage
  gelingt.
- Seitenpanel für den Kern: Datum, Wetter und Temperatur morgens und
  nachmittags, Anwesenheit, Leistungen, Notizen. Kein Material buchen, kein
  Foto, kein Mangel, kein PDF.
- Anwesenheit als Replace auf `daily_report_employees`. Von/Bis und eine
  Zeile in `time_entries` nur mit `canTrackTime` oder `canTrackTimeForTeam`,
  und nur für die Anstellungen, die das Recht trifft. Abgerechnete Zeiten
  bleiben stehen.
- Zweiter Bericht am selben Tag: Klartext, Unique
  `(order_id, report_date)`. Löschen erst nach der Server-Antwort, mit
  Lade-Zustand. Abgerechnetes und jede Verknüpfung sperren das Löschen; die
  CASCADE-Warnung bleibt nur für den leeren Bericht. Panel und Dialog bleiben
  offen, solange Speichern oder Löschen läuft (`useDismissLock`).
- Insert mit clientseitiger `id`, `user_id` des angemeldeten Nutzers und
  `modified_at`. Update schreibt die Kernfelder, nie Materialtext, besondere
  Vorkommnisse oder den Autor.

## Warum

Ohne den Block sieht das Web die Tagesberichte nicht, die die Baustelle
schon geschrieben hat, und kann keinen nachtragen. Die Zeit aus der
Anwesenheit darf nur entstehen, wo die Zeiterfassung sie auch sonst
durchlässt — sonst scheitert das Speichern an RLS, obwohl der Bericht selbst
gültig wäre. Die Kaskade ist kein Hinweis in der Policy, sondern ein
Fremdschlüssel ohne `FORCE ROW LEVEL SECURITY`; wer den Bericht löscht,
räumt mehr ab, als die Liste zeigt.

Issue: [#57](https://github.com/BuenyA/bautakt-web/issues/57).

## Verweise

- [bautagebuch.md](../pages/bautagebuch.md)
- Code: `apps/webapp/src/features/orders/OrderDailyReports.tsx`,
  `DailyReportSheet.tsx`, `dailyReportDraft.ts`,
  `useDailyReportMutations.ts`
