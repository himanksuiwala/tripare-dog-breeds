import {
  CATALOGUE_STALE_AFTER_MS,
  formatLastSynced,
  isCatalogueStale,
} from "./catalogueFreshness";

describe("catalogue freshness", () => {
  const now = 2_000_000_000_000;

  it("becomes stale after thirty minutes without expiring", () => {
    expect(isCatalogueStale(now - CATALOGUE_STALE_AFTER_MS + 1, now)).toBe(
      false,
    );
    expect(isCatalogueStale(now - CATALOGUE_STALE_AFTER_MS, now)).toBe(true);
    expect(isCatalogueStale(null, now)).toBe(true);
  });

  it("formats the age of the last successful sync", () => {
    expect(formatLastSynced(now, now)).toBe("Synced just now");
    expect(formatLastSynced(now - 2 * 60_000, now)).toBe(
      "Last synced 2 minutes ago",
    );
    expect(formatLastSynced(now - 2 * 60 * 60_000, now)).toBe(
      "Last synced 2 hours ago",
    );
  });
});
