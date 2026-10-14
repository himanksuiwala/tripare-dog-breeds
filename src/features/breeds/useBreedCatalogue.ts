import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type { Breed, BreedGroup } from "../../api/breeds";
import { readCachedCatalogue } from "../../data/catalogueDatabase";
import { isCatalogueStale } from "./catalogueFreshness";
import {
  synchronizeCatalogue,
  type CatalogueSyncProgress,
} from "./catalogueSync";

export {
  fetchBreedPageWithLoader,
  fetchBreedPageWithRetry,
  mergeBreedPages,
} from "./useBreedCatalogueHelpers";

type CatalogueState = {
  breeds: Breed[];
  groups: BreedGroup[];
  groupsUnavailable: boolean;
  totalRecords: number | null;
  loadedPages: number;
  totalPages: number | null;
  lastSuccessfulSyncAt: number | null;
  isOffline: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isPullRefreshing: boolean;
  isCompletingCatalogue: boolean;
  isCatalogueIncomplete: boolean;
  hasError: boolean;
  errorMessage: string | null;
};

const initialState: CatalogueState = {
  breeds: [],
  groups: [],
  groupsUnavailable: false,
  totalRecords: null,
  loadedPages: 0,
  totalPages: null,
  lastSuccessfulSyncAt: null,
  isOffline: false,
  isLoading: true,
  isRefreshing: false,
  isPullRefreshing: false,
  isCompletingCatalogue: false,
  isCatalogueIncomplete: false,
  hasError: false,
  errorMessage: null,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not update catalogue.";
}

export function useBreedCatalogue() {
  const [state, setState] = useState(initialState);
  const mounted = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const applyProgress = useCallback((progress: CatalogueSyncProgress) => {
    if (!mounted.current) return;
    setState((current) => ({
      ...current,
      breeds: current.isRefreshing ? current.breeds : progress.breeds,
      groups: progress.groups,
      groupsUnavailable: progress.groupsUnavailable,
      totalRecords: progress.totalRecords,
      loadedPages: progress.loadedPages,
      totalPages: progress.totalPages,
      isLoading: false,
      isCompletingCatalogue: progress.loadedPages < progress.totalPages,
      isCatalogueIncomplete: false,
      hasError: false,
      errorMessage: null,
    }));
  }, []);

  const sync = useCallback(
    async (manual: boolean) => {
      const current = stateRef.current;
      if (!manual && !isCatalogueStale(current.lastSuccessfulSyncAt)) return;
      setState((value) => ({
        ...value,
        isRefreshing: value.breeds.length > 0,
        isPullRefreshing: manual && value.breeds.length > 0,
        isCompletingCatalogue: value.breeds.length === 0,
        hasError: false,
        errorMessage: null,
      }));
      try {
        const result = await synchronizeCatalogue(applyProgress);
        if (!mounted.current) return;
        setState((value) => ({
          ...value,
          breeds: result.breeds,
          groups: result.groups,
          groupsUnavailable: result.groupsUnavailable,
          totalRecords: result.totalRecords,
          loadedPages: result.loadedPages,
          totalPages: result.totalPages,
          lastSuccessfulSyncAt: result.lastSuccessfulSyncAt,
          isLoading: false,
          isRefreshing: false,
          isPullRefreshing: false,
          isCompletingCatalogue: false,
          isCatalogueIncomplete: false,
          hasError: false,
          errorMessage: null,
        }));
      } catch (error: unknown) {
        if (!mounted.current) return;
        const cached = await readCachedCatalogue();
        if (!mounted.current) return;
        setState((value) => ({
          ...value,
          breeds: cached.breeds.length > 0 ? cached.breeds : value.breeds,
          groups: cached.groups.length > 0 ? cached.groups : value.groups,
          totalRecords: cached.totalRecords ?? value.totalRecords,
          loadedPages: cached.loadedPages || value.loadedPages,
          totalPages: cached.totalPages ?? value.totalPages,
          lastSuccessfulSyncAt: cached.lastSuccessfulSyncAt,
          isLoading: false,
          isRefreshing: false,
          isPullRefreshing: false,
          isCompletingCatalogue: false,
          isCatalogueIncomplete: cached.breeds.length > 0 && !cached.isComplete,
          hasError: cached.breeds.length === 0 && value.breeds.length === 0,
          errorMessage: getErrorMessage(error),
        }));
      }
    },
    [applyProgress],
  );

  useEffect(() => {
    mounted.current = true;
    void readCachedCatalogue()
      .then((cached) => {
        if (!mounted.current) return;
        setState((current) => ({
          ...current,
          breeds: cached.breeds,
          groups: cached.groups,
          totalRecords: cached.totalRecords,
          loadedPages: cached.loadedPages,
          totalPages: cached.totalPages,
          lastSuccessfulSyncAt: cached.lastSuccessfulSyncAt,
          isLoading: cached.breeds.length === 0,
          isCatalogueIncomplete: cached.breeds.length > 0 && !cached.isComplete,
        }));
        if (isCatalogueStale(cached.lastSuccessfulSyncAt)) {
          void sync(false);
        }
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        setState((current) => ({
          ...current,
          isLoading: false,
          hasError: true,
          errorMessage: getErrorMessage(error),
        }));
      });

    const unsubscribeNetwork = NetInfo.addEventListener((network) => {
      const isOffline =
        network.isConnected === false || network.isInternetReachable === false;
      setState((current) => ({ ...current, isOffline }));
      if (!isOffline) void sync(false);
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") void sync(false);
      },
    );

    return () => {
      mounted.current = false;
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, [sync]);

  const retry = useCallback(() => void sync(true), [sync]);
  const refresh = useCallback(() => void sync(true), [sync]);
  const retryBackground = useCallback(() => void sync(true), [sync]);

  return { state, retry, refresh, retryBackground };
}
