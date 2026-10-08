# 2026-10-08 — Zeit am Auftrag und auf /zeiten schreiben

`/zeiten` konnte einen Eintrag anlegen, aber nur mit `canTrackTimeForTeam`,
ohne `user_id` und ohne Satz. Das Auftragsdetail hat die Zeiten nur gelesen.
Bearbeiten und Löschen gab es nirgends. Die Handy-App schreibt dieselben
Spalten längst.

Der Insert für die eigene Zeiterfassung verlangt `user_id = auth.uid()`. Ohne
die Id der Anstellung lehnt die Policy ab, obwohl das Recht da ist. Der Trigger
`trg_time_entries_billing_fields` füllt `cost_rate` und `billing_rate` nur, wenn
das Konto kein `canManageRates` hat. Geschäftsführung hätte sonst NULL in die
Rechnung geschrieben. `resolve_labor_rate` bleibt für `authenticated` gesperrt:
sie ist `SECURITY DEFINER` ohne Mitgliedschaftsprüfung. Die Kaskade läuft über
die lesbaren `labor_rates`.

Abgerechnete Einträge (`billed_document_id`, 22 von 40 am 2026-10-08) lassen
sich im Web nicht mehr ändern oder löschen. Die Datenbank sperrt das nicht.
Ein Entwurf, der die Zeit schon als Position kopiert hat, wird nicht
nachgezogen: die Belegsumme hängt an den Positionen.

Issue: [#46](https://github.com/BuenyA/bautakt-web/issues/46).
