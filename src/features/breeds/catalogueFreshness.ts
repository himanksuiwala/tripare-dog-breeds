export const CATALOGUE_STALE_AFTER_MS = 30 * 60 * 1000;

export function isCatalogueStale(
  lastSuccessfulSyncAt: number | null,
  now = Date.now(),
): boolean {
  if (lastSuccessfulSyncAt === null) return true;
  return now - lastSuccessfulSyncAt >= CATALOGUE_STALE_AFTER_MS;
}

export function formatLastSynced(
  lastSuccessfulSyncAt: number | null,
  now = Date.now(),
): string | null {
  if (lastSuccessfulSyncAt === null) return null;
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now - lastSuccessfulSyncAt) / 60_000),
  );
  if (elapsedMinutes < 1) return "Synced just now";
  if (elapsedMinutes < 60) {
    return `Last synced ${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `Last synced ${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
}
