import NetInfo from "@react-native-community/netinfo";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import {
  readCachedCatalogue,
  type CachedCatalogue,
} from "../../data/catalogueDatabase";
import { isCatalogueStale } from "./catalogueFreshness";
import {
  synchronizeCatalogue,
  type CatalogueSyncProgress,
} from "./catalogueSync";
import {
  catalogueSyncReducer,
  initialCatalogueSyncState,
  type CatalogueSyncState,
} from "./catalogueSyncReducer";

type CatalogueView = CachedCatalogue & {
  groupsUnavailable: boolean;
};

type SyncTrigger = "automatic" | "manual";

type CatalogueSyncContextValue = {
  catalogue: CatalogueView;
  state: CatalogueSyncState;
  sync: (trigger: SyncTrigger) => Promise<void>;
};

const emptyCatalogue: CatalogueView = {
  breeds: [],
  groups: [],
  groupsUnavailable: false,
  lastSuccessfulSyncAt: null,
  totalRecords: null,
  totalPages: null,
  loadedPages: 0,
  isComplete: false,
};

const CatalogueSyncContext = createContext<CatalogueSyncContextValue | null>(
  null,
);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not update catalogue.";
}

function progressToCatalogue(
  progress: CatalogueSyncProgress,
  current: CatalogueView,
): CatalogueView {
  return {
    breeds: progress.breeds,
    groups: progress.groups,
    groupsUnavailable: progress.groupsUnavailable,
    lastSuccessfulSyncAt: current.lastSuccessfulSyncAt,
    totalRecords: progress.totalRecords,
    totalPages: progress.totalPages,
    loadedPages: progress.loadedPages,
    isComplete: false,
  };
}

export function CatalogueSyncProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    catalogueSyncReducer,
    initialCatalogueSyncState,
  );
  const [catalogue, setCatalogue] = useState(emptyCatalogue);
  const mounted = useRef(true);

  const sync = useCallback(async (trigger: SyncTrigger) => {
    const cached = await readCachedCatalogue();
    if (
      trigger === "automatic" &&
      !isCatalogueStale(cached.lastSuccessfulSyncAt)
    ) {
      return;
    }

    dispatch({
      type: "SYNC_STARTED",
      mode: cached.breeds.length === 0 ? "initial" : "refresh",
      trigger,
      loadedPages: cached.loadedPages,
      totalPages: cached.totalPages,
    });

    try {
      const result = await synchronizeCatalogue((progress) => {
        if (!mounted.current) return;
        if (cached.breeds.length === 0) {
          setCatalogue((current) => progressToCatalogue(progress, current));
        }
        dispatch({
          type: "SYNC_PROGRESS",
          loadedPages: progress.loadedPages,
          totalPages: progress.totalPages,
        });
      });
      if (!mounted.current) return;
      const refreshed = await readCachedCatalogue();
      if (!mounted.current) return;
      setCatalogue({
        ...refreshed,
        groupsUnavailable: result.groupsUnavailable,
      });
      dispatch({
        type: "SYNC_SUCCEEDED",
        completedAt: result.lastSuccessfulSyncAt,
      });
    } catch (error: unknown) {
      if (!mounted.current) return;
      const fallback = await readCachedCatalogue();
      if (!mounted.current) return;
      setCatalogue((current) => ({
        ...fallback,
        groupsUnavailable: current.groupsUnavailable,
      }));
      dispatch({
        type: "SYNC_FAILED",
        hasCachedData: fallback.breeds.length > 0,
        isComplete: fallback.isComplete,
        lastSuccessfulSyncAt: fallback.lastSuccessfulSyncAt,
        loadedPages: fallback.loadedPages,
        totalPages: fallback.totalPages,
        message: getErrorMessage(error),
      });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void readCachedCatalogue()
      .then((cached) => {
        if (!mounted.current) return;
        setCatalogue({ ...cached, groupsUnavailable: false });
        dispatch({
          type: "CACHE_LOADED",
          lastSuccessfulSyncAt: cached.lastSuccessfulSyncAt,
          isComplete: cached.isComplete,
          loadedPages: cached.loadedPages,
          totalPages: cached.totalPages,
        });
        if (isCatalogueStale(cached.lastSuccessfulSyncAt)) {
          void sync("automatic");
        }
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        dispatch({
          type: "SYNC_FAILED",
          hasCachedData: false,
          isComplete: false,
          lastSuccessfulSyncAt: null,
          loadedPages: 0,
          totalPages: null,
          message: getErrorMessage(error),
        });
      });

    const unsubscribeNetwork = NetInfo.addEventListener((network) => {
      const isOffline =
        network.isConnected === false || network.isInternetReachable === false;
      dispatch({ type: "NETWORK_CHANGED", isOffline });
      if (!isOffline) void sync("automatic");
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") void sync("automatic");
      },
    );

    return () => {
      mounted.current = false;
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, [sync]);

  const value = useMemo(
    () => ({ catalogue, state, sync }),
    [catalogue, state, sync],
  );

  return (
    <CatalogueSyncContext.Provider value={value}>
      {children}
    </CatalogueSyncContext.Provider>
  );
}

export function useCatalogueSync(): CatalogueSyncContextValue {
  const context = useContext(CatalogueSyncContext);
  if (context === null) {
    throw new Error(
      "useCatalogueSync must be used inside CatalogueSyncProvider.",
    );
  }
  return context;
}

export type { CatalogueView, SyncTrigger };
