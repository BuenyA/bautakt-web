/**
 * Seiten, die genau bis zum unteren Fensterrand reichen: Fensterhöhe minus
 * Kopfzeile (`h-14`) und Innenabstand von `main` (`sm:p-6`, oben und unten) —
 * siehe `AppShell`. Darin füllt ein Bereich mit `flex-1 min-h-0` den Rest und
 * scrollt in sich. Die Mindesthöhe verhindert, dass niedrige Fenster alles
 * zusammendrücken; dann scrollt die Seite.
 *
 * ⚠️ Ändert sich die Kopfzeile oder der Abstand in `AppShell`, hier mitziehen.
 * Je Breakpoint eine eigene Konstante, weil Tailwind die Klassen ausgeschrieben
 * im Quelltext finden muss.
 */
export const FILL_VIEWPORT_SM = 'sm:h-[calc(100svh-3.5rem-3rem)] sm:min-h-[560px]';
export const FILL_VIEWPORT_XL = 'xl:h-[calc(100svh-3.5rem-3rem)] xl:min-h-[560px]';
