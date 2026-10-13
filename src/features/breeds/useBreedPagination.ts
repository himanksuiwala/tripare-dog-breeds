import { useCallback, useEffect, useReducer, useRef } from "react";

import { fetchBreedPage } from "../../api/breeds";
import {
  breedPaginationReducer,
  initialBreedPaginationState,
} from "./breedPagination";

type LoadOperation = "initial" | "refresh" | "append";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong while loading breeds.";
}

export function useBreedPagination() {
  const [state, dispatch] = useReducer(
    breedPaginationReducer,
    initialBreedPaginationState,
  );
  const activeRequest = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async (page: number, operation: LoadOperation) => {
      if (activeRequest.current && operation === "append") {
        return;
      }

      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;

      dispatch({ type: `${operation}-start` });

      try {
        const breedPage = await fetchBreedPage(page, controller.signal);
        dispatch({
          type: operation === "append" ? "append-success" : "replace-success",
          page: breedPage,
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        if (operation === "initial") {
          dispatch({ type: "initial-failure", message: errorMessage(error) });
        } else if (operation === "refresh") {
          dispatch({ type: "refresh-failure" });
        } else {
          dispatch({ type: "append-failure", message: errorMessage(error) });
        }
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = null;
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadPage(1, "initial");
    return () => activeRequest.current?.abort();
  }, [loadPage]);

  const refresh = useCallback(() => {
    void loadPage(1, "refresh");
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (state.nextPage !== null && !state.isLoadingMore) {
      void loadPage(state.nextPage, "append");
    }
  }, [loadPage, state.isLoadingMore, state.nextPage]);

  const retryInitial = useCallback(() => {
    void loadPage(1, "initial");
  }, [loadPage]);

  return { state, refresh, loadMore, retryInitial };
}
