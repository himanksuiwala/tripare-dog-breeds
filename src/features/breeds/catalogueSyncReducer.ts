export type SyncPhase =
  | { status: "initializing" }
  | {
      status: "syncing";
      mode: "initial" | "refresh";
      trigger: "automatic" | "manual";
      loadedPages: number;
      totalPages: number | null;
    }
  | { status: "ready"; lastSuccessfulSyncAt: number }
  | {
      status: "incomplete";
      loadedPages: number;
      totalPages: number | null;
      message: string | null;
    }
  | {
      status: "error";
      hasCachedData: boolean;
      lastSuccessfulSyncAt: number | null;
      message: string;
    };

export type CatalogueSyncState = {
  phase: SyncPhase;
  isOffline: boolean;
};

export const initialCatalogueSyncState: CatalogueSyncState = {
  phase: { status: "initializing" },
  isOffline: false,
};

export type CatalogueSyncAction =
  | {
      type: "CACHE_LOADED";
      lastSuccessfulSyncAt: number | null;
      isComplete: boolean;
      loadedPages: number;
      totalPages: number | null;
    }
  | {
      type: "SYNC_STARTED";
      mode: "initial" | "refresh";
      trigger: "automatic" | "manual";
      loadedPages: number;
      totalPages: number | null;
    }
  | { type: "SYNC_PROGRESS"; loadedPages: number; totalPages: number }
  | { type: "SYNC_SUCCEEDED"; completedAt: number }
  | {
      type: "SYNC_FAILED";
      hasCachedData: boolean;
      isComplete: boolean;
      lastSuccessfulSyncAt: number | null;
      loadedPages: number;
      totalPages: number | null;
      message: string;
    }
  | { type: "NETWORK_CHANGED"; isOffline: boolean };

export function catalogueSyncReducer(
  state: CatalogueSyncState,
  action: CatalogueSyncAction,
): CatalogueSyncState {
  switch (action.type) {
    case "CACHE_LOADED":
      return {
        ...state,
        phase:
          action.lastSuccessfulSyncAt !== null && action.isComplete
            ? {
                status: "ready",
                lastSuccessfulSyncAt: action.lastSuccessfulSyncAt,
              }
            : action.loadedPages > 0
              ? {
                  status: "incomplete",
                  loadedPages: action.loadedPages,
                  totalPages: action.totalPages,
                  message: null,
                }
              : { status: "initializing" },
      };
    case "SYNC_STARTED":
      return {
        ...state,
        phase: {
          status: "syncing",
          mode: action.mode,
          trigger: action.trigger,
          loadedPages: action.loadedPages,
          totalPages: action.totalPages,
        },
      };
    case "SYNC_PROGRESS":
      return state.phase.status === "syncing"
        ? {
            ...state,
            phase: {
              ...state.phase,
              loadedPages: action.loadedPages,
              totalPages: action.totalPages,
            },
          }
        : state;
    case "SYNC_SUCCEEDED":
      return {
        ...state,
        phase: {
          status: "ready",
          lastSuccessfulSyncAt: action.completedAt,
        },
      };
    case "SYNC_FAILED":
      return {
        ...state,
        phase:
          action.hasCachedData && !action.isComplete
            ? {
                status: "incomplete",
                loadedPages: action.loadedPages,
                totalPages: action.totalPages,
                message: action.message,
              }
            : {
                status: "error",
                hasCachedData: action.hasCachedData,
                lastSuccessfulSyncAt: action.lastSuccessfulSyncAt,
                message: action.message,
              },
      };
    case "NETWORK_CHANGED":
      return { ...state, isOffline: action.isOffline };
  }
}
