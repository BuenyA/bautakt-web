# 2026-11-06 Angebote: Auftragssumme aus Angeboten (bautakt-app#188)

- Übersicht, Finanzkarte, Finanzseite und Kostenstellen lesen `order_contract_totals`.
- Im Browser mit erfundenem Betrieb geprüft: Auftrag mit Summe von Hand 9.000 €,
  angenommenes Angebot mit Alternative, Bedarf und 3 % Rabatt plus Nachtrag zeigt
  9.228,50 € mit Herkunft „Aus den angenommenen Angeboten“.
- Testliste in `apps/webapp/package.json` ist ausdrücklich: neue `*.test.ts` dort
  eintragen und mit `.ts` importieren, sonst laufen sie nicht.
