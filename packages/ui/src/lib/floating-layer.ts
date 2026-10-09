/**
 * Portale, deren Fokus oder Klick ein Sheet oder einen Dialog nicht schließen darf.
 *
 * Bestätigungsdialoge und der Kalender liegen im Portal, also außerhalb des
 * Panels. Radix prüft die Layer-Reihenfolge dabei nicht: sobald der Fokus ins
 * Portal wandert, gilt das als „draußen“ und das Panel geht zu. Der Kalender
 * wäre weg, bevor man einen Tag wählen kann. Dieselbe Falle wie beim
 * Löschdialog über der Checkliste.
 */
const FLOATING_LAYER_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="dialog-overlay"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="alert-dialog-overlay"]',
  '[data-slot="popover-content"]',
  '[data-radix-popper-content-wrapper]',
].join(', ');

export function isFloatingLayerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(FLOATING_LAYER_SELECTOR));
}
