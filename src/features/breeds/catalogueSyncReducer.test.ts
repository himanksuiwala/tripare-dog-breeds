import {
  catalogueSyncReducer,
  initialCatalogueSyncState,
} from "./catalogueSyncReducer";

describe("catalogueSyncReducer", () => {
  it("keeps manual refresh distinct from background refresh", () => {
    const state = catalogueSyncReducer(initialCatalogueSyncState, {
      type: "SYNC_STARTED",
      mode: "refresh",
      trigger: "manual",
      loadedPages: 6,
      totalPages: 6,
    });

    expect(state.phase).toEqual({
      status: "syncing",
      mode: "refresh",
      trigger: "manual",
      loadedPages: 6,
      totalPages: 6,
    });
  });

  it("represents a partial first sync as incomplete", () => {
    const state = catalogueSyncReducer(initialCatalogueSyncState, {
      type: "SYNC_FAILED",
      hasCachedData: true,
      isComplete: false,
      lastSuccessfulSyncAt: null,
      loadedPages: 2,
      totalPages: 6,
      message: "Page 3 failed.",
    });

    expect(state.phase).toEqual({
      status: "incomplete",
      loadedPages: 2,
      totalPages: 6,
      message: "Page 3 failed.",
    });
  });

  it("tracks connectivity independently from the sync phase", () => {
    const ready = catalogueSyncReducer(initialCatalogueSyncState, {
      type: "SYNC_SUCCEEDED",
      completedAt: 123,
    });
    const offline = catalogueSyncReducer(ready, {
      type: "NETWORK_CHANGED",
      isOffline: true,
    });

    expect(offline).toEqual({
      phase: { status: "ready", lastSuccessfulSyncAt: 123 },
      isOffline: true,
    });
  });
});
