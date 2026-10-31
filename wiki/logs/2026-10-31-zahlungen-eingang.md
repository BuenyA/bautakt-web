# 2026-10-31 Zahlungen auf Eingangsrechnungen (#270, Web-Teil)

Zweiter Teil von #270. Der erste Teil (Migration, App) ist bautakt-app#167.
Entscheidungen des Owners vom 31.10.: Korrektur per Storno, teilbezahlt und
bezahlt nur aus den Zahlungen, offene Eingangsrechnungen zählen mit dem
Restbetrag.

- Abschnitt „Zahlungen“ auf der Seite einer Eingangsrechnung: erfassen,
  stornieren mit Begründung, Zahlbetrag, gezahlt, offen. Siehe
  [rechnungsbereich.md](../pages/rechnungsbereich.md#zahlungen-auf-eingangsrechnungen-270).
- Statusauswahl ohne teilbezahlt und bezahlt; steht die Rechnung so, ist sie
  gesperrt.
- Karte „Eingangsrechnungen“, Fristen der Startseite und die neue Spalte
  „Offen“ der Liste zählen den Restbetrag aus `incoming_invoice_balances`.
- Skonto an einer bezahlten Rechnung wird nicht mehr angeboten.
- `database.types.ts` von Hand ergänzt (Tabelle, Sicht, zwei RPCs), weil die
  Migration bei Erstellung noch nicht eingespielt war.
