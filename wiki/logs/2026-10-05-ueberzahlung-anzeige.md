# 2026-10-05 — Überzahlung auf der Rechnung sichtbar

RE00002 (Spahrbau) steht auf `paid` mit 20.000 € Zahlung bei 13.452,95 € Brutto.
Die Detailseite klemmte den Rest mit `Math.max(0, …)` auf 0 € und zeigte
„Bezahlt“ plus „Offen: 0,00 €“, ohne den Überschuss zu benennen.

Der Trigger `update_document_payment_status` behandelt `gezahlt >= brutto`
einheitlich als `paid`. Ein eigener Status wäre eine Schemaänderung in
`bautakt-app` und ist hier bewusst nicht gemacht. Offene Posten bleiben
unverändert: ein überzahlter Beleg hat Status `paid` und fällt dort schon
vorher raus.

Die Web-Oberfläche rechnet den Überschuss daneben (`overpaidMinor` in
`@bautakt/finance`, `overpaidMinorOf` auf dem Beleg) und zeigt ihn auf der
Rechnungsdetailseite und im Zahlungsformular. Teilzahlung und exakte
Vollzahlung bleiben bei „Offen“. Offene Posten klemmen weiter auf 0 und nehmen
einen überzahlten Beleg nicht auf.

Issue: [#37](https://github.com/BuenyA/bautakt-web/issues/37).
