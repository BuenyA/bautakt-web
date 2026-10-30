# 2026-10-30 — DATEV-Export: Eingangsrechnungen

Die Seite „DATEV-Export“ konnte nur Ausgangsrechnungen. Seit bautakt-app#164
liefert `datev-export` mit `direction: "incoming"` einen eigenen Stapel für den
Eingang.

## Was geändert wurde

- Auswahl „Belege“ (Ausgangs-/Eingangsrechnungen) neben „Monat“.
- Beleg-ZIP für den Eingang mit den Originalen (PDF, XML, Bild).
- Texte für die neuen Befunde (Kreditor, Steueraufteilung, Freigabe …).

## Entscheidung

Fehlt bei einer Eingangsrechnung das Original, blockiert das den Export nicht.
Sie fehlt im ZIP und wird genannt. Eingangsrechnungen dürfen ohne Datei erfasst
sein, Ausgangsrechnungen haben nach dem Festschreiben immer ein Archiv-PDF.

## Verweise

- [rechnungsbereich.md](../pages/rechnungsbereich.md#datev-export-rechnungendatev-export)
- bautakt-web#169, bautakt-web#168
