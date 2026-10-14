import { useCallback } from "react";

import { useCatalogueSync } from "./CatalogueSyncContext";

export {
  fetchBreedPageWithLoader,
  fetchBreedPageWithRetry,
  mergeBreedPages,
} from "./useBreedCatalogueHelpers";

export function useBreedCatalogue() {
  const { catalogue, state: syncState, sync } = useCatalogueSync();
  const { phase } = syncState;
  const isSyncing = phase.status === "syncing";
  const hasCachedData = catalogue.breeds.length > 0;
  const errorMessage =
    phase.status === "error" || phase.status === "incomplete"
      ? phase.message
      : null;

  const state = {
    breeds: catalogue.breeds,
    groups: catalogue.groups,
    groupsUnavailable: catalogue.groupsUnavailable,
    totalRecords: catalogue.totalRecords,
    loadedPages:
      phase.status === "syncing" || phase.status === "incomplete"
        ? phase.loadedPages
        : catalogue.loadedPages,
    totalPages:
      phase.status === "syncing" || phase.status === "incomplete"
        ? phase.totalPages
        : catalogue.totalPages,
    lastSuccessfulSyncAt: catalogue.lastSuccessfulSyncAt,
    isOffline: syncState.isOffline,
    isLoading: phase.status === "initializing" || (isSyncing && !hasCachedData),
    isRefreshing: isSyncing && hasCachedData,
    isPullRefreshing: isSyncing && phase.trigger === "manual" && hasCachedData,
    isCompletingCatalogue: isSyncing && !catalogue.isComplete,
    isCatalogueIncomplete: hasCachedData && !catalogue.isComplete,
    hasError: phase.status === "error" && !phase.hasCachedData,
    errorMessage,
  };

  const retry = useCallback(() => void sync("manual"), [sync]);
  const refresh = useCallback(() => void sync("manual"), [sync]);
  const retryBackground = useCallback(() => void sync("manual"), [sync]);

  return { state, retry, refresh, retryBackground };
}
