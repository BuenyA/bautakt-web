# 2026-10-08 — Notizen am Auftrag schreiben

Auf dem Auftragsdetail lassen sich Notizen anlegen, bearbeiten und löschen.
Dieselbe Tabelle `order_notes` wie in der Handy-App, dieselben zwei
Inhaltsfelder.

## Was geändert wurde

- `OrderNoteSheet` schreibt Titel und Text. Mindestens eines von beiden muss
  nach dem Trim Inhalt haben. `id` kommt vom Client, `user_id` ist beim
  Anlegen der angemeldete Nutzer. `modified_at` setzt der Client.
- Beim Bearbeiten bleiben Autor, `created_at`, Betrieb und Auftrag
  unangetastet. Unveränderter Text löst keinen Schreibzugriff aus.
- Knöpfe nur mit `canCreateNotes`. Mit dem Recht öffnet jede sichtbare Notiz
  das Panel, die eigene und die fremde. Ohne das Recht bleibt die Liste
  lesend, der leere Hinweis verweist weiter auf die Handy-App.
- Löschen fragt nach.

## Warum

Geschäftsführung und Polier schreiben am Schreibtisch in dieselbe Liste, die
auf der Baustelle schon existiert. Eine zweite Tabelle oder ein Upsert der
ganzen Zeile hätte den Autor überschrieben, sobald die Handy-App ihren Cache
zurückschreibt. Die Policies unterscheiden seit dem 11.08.2026 nicht mehr
zwischen eigenen und fremden Notizen; die Oberfläche folgt dem.

Issue: [#47](https://github.com/BuenyA/bautakt-web/issues/47).

## Verweise

- Code: `apps/webapp/src/features/orders/OrderNotes.tsx`,
  `OrderNoteSheet.tsx`, `useOrderNoteMutations.ts`
- [auftragsnotizen.md](../pages/auftragsnotizen.md)
