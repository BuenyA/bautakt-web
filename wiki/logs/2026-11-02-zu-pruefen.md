# 2026-11-02 Mail-Anhänge „Zu prüfen“ (#281)

Über den Eingangsrechnungen steht ein eigener Abschnitt, sobald es Mail-Anhänge ohne
E-Rechnung gibt. Das Schema steht im Wiki von `bautakt-app`.

- Die Einträge sind keine Belege. Die Liste, ihre Filter und der CSV-Export der
  Eingangsrechnungen sehen sie nicht.
- „Als Rechnung erfassen“ legt den Entwurf an und öffnet ihn. „Keine Rechnung“ blendet den
  Eintrag in einen aufklappbaren Teil aus, von dort geht es noch zurück.
- Der Abschnitt lädt die Datei über den vorhandenen Weg `downloadIncomingOriginal` und öffnet sie
  in einem neuen Fenster. Das Fenster wird vor dem Laden geöffnet, weil der Browser es danach
  blockieren würde.
