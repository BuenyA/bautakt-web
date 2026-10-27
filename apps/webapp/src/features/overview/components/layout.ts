/**
 * Inhalt einer der drei Spalten (Einsatzplan, Heute, Zu erledigen). Auf dem
 * breiten Bildschirm stehen sie in einer Reihe, die bis an den unteren
 * Fensterrand reicht; die Karte gibt die Höhe vor, ihr Inhalt scrollt in sich —
 * der Kartenkopf bleibt stehen.
 */
export const COLUMN_FILL_SCROLL =
  // overflow-x ausdrücklich verstecken: wer nur overflow-y setzt, bekommt von
  // CSS auch seitliches Scrollen, sobald etwas einen Pixel übersteht.
  'min-h-0 xl:overflow-x-hidden xl:overflow-y-auto xl:pr-1';
