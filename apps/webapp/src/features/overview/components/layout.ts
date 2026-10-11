/**
 * Inhalt einer der drei Spalten (Einsatzplan, Heute, Zu erledigen). Auf dem
 * breiten Bildschirm stehen sie in einer Reihe; damit eine volle Spalte die
 * Reihe nicht endlos streckt, scrollt ihr Inhalt ab einer Höhe selbst — der
 * Kartenkopf bleibt stehen.
 */
export const COLUMN_SCROLL =
  // overflow-x ausdrücklich verstecken: wer nur overflow-y setzt, bekommt von
  // CSS auch seitliches Scrollen, sobald etwas einen Pixel übersteht.
  'min-h-0 xl:max-h-[640px] xl:overflow-x-hidden xl:overflow-y-auto xl:pr-1';
