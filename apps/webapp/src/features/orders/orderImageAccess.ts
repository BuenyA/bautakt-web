/**
 * UI-Führung fürs Löschen. Keine Kontrolle — die Delete-Policy auf
 * `order_images` entscheidet.
 *
 * Gemessen 2026-10-08: eigene Zeile mit `canTakePhotos`, oder jede Zeile mit
 * `canManageOrders`.
 */
export function canDeleteOrderPhoto(input: {
  photoUserId: string;
  currentUserId: string | undefined;
  canTakePhotos: boolean;
  canManageOrders: boolean;
}): boolean {
  if (input.canManageOrders) return true;
  return (
    input.canTakePhotos && Boolean(input.currentUserId) && input.photoUserId === input.currentUserId
  );
}

/** `{companyId}/{orderId}/{imageId}.jpg` — dieselbe Form wie in der Handy-App. */
export function orderImageStoragePath(companyId: string, orderId: string, imageId: string): string {
  return `${companyId}/${orderId}/${imageId}.jpg`;
}
