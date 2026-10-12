# 2026-10-12 — Löschen nur noch als Mülleimer

## Was geändert wurde

- Neu `DeleteButton` in `packages/ui` (`danger-button.tsx`): roter Block mit
  Mülleimer, der Text steht als Tooltip und aria-label dran.
- Umgestellt sind alle Auslöser, die vorher Text trugen: Einsatz- und
  Abwesenheits-Detailseite, die Panels für Termin, Zeiteintrag, Notiz,
  Checklistenpunkt, Material, Tagesbericht, dazu die Großansicht eines Fotos.
- Die Bestätigungsdialoge behalten ihren roten Knopf mit Text.
- Im Panel-Fuß steht der Mülleimer jetzt wirklich links (`mr-auto!`).

## Warum

Owner-Wunsch: „Termin löschen“, „Endgültig löschen“ und Ähnliches nahmen neben
Zurück und Bearbeiten zu viel Platz weg. Was gelöscht wird, sagt der Dialog
danach ohnehin ausgeschrieben.

## Geprüft

- `npm run check` grün.
- Harness (Abwesenheits-Detailseite, Termin-Panel): hell, dunkel, 390 px;
  Knopf 32 × 32, Tooltip mit dem Löschtext, der Dialog öffnet mit Text-Knopf,
  keine Konsolenfehler. Die übrigen Panels nur per Typprüfung, sie nutzen
  denselben Fuß.
