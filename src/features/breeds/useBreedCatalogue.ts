import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchBreedGroups,
  fetchBreedPage,
  type Breed,
  type BreedGroup,
} from "../../api/breeds";

const CATALOGUE_REQUEST_ATTEMPTS = 3;

type CatalogueState = {
  breeds: Breed[];
  groups: BreedGroup[];
  groupsUnavailable: boolean;
  totalRecords: number | null;
  loadedPages: number;
  totalPages: number | null;
  isLoading: boolean;
  isRefreshing: boolean;
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
  isLoading: true,
  isRefreshing: false,
  isCompletingCatalogue: false,
  isCatalogueIncomplete: false,
  hasError: false,
  errorMessage: null,
};

export function mergeBreedPages(
  pages: { page: number; breeds: Breed[] }[],
): Breed[] {
  const unique = new Map<string, Breed>();
  for (const result of [...pages].sort((a, b) => a.page - b.page)) {
    for (const breed of result.breeds) unique.set(breed.id, breed);
  }
  return [...unique.values()];
}

export async function fetchBreedPageWithRetry(
  pageNumber: number,
  signal: AbortSignal,
  attempts = CATALOGUE_REQUEST_ATTEMPTS,
) {
  return fetchBreedPageWithLoader(pageNumber, signal, attempts, fetchBreedPage);
}

export async function fetchBreedPageWithLoader(
  pageNumber: number,
  signal: AbortSignal,
  attempts: number,
  loader: typeof fetchBreedPage,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await loader(pageNumber, signal);
    } catch (error: unknown) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw new Error(
    `Page ${pageNumber}: ${lastError instanceof Error ? lastError.message : "Could not load breed page."}`,
  );
}

export function useBreedCatalogue() {
  const [state, setState] = useState(initialState);
  const [requestKey, setRequestKey] = useState(0);
  const [backgroundRetryKey, setBackgroundRetryKey] = useState(0);
  const preserveExistingCatalogue = useRef(false);
  const preservedCatalogueWasIncomplete = useRef(false);
  const backgroundTotalPages = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const groupsRequest = fetchBreedGroups(controller.signal)
      .then((groups) => ({ groups, unavailable: false }))
      .catch(() => ({ groups: [] as BreedGroup[], unavailable: true }));

    void fetchBreedPageWithRetry(1, controller.signal)
      .then(async (firstPage) => {
        const totalPages = firstPage.pagination.lastPage;
        const secondPage =
          totalPages > 1
            ? await fetchBreedPageWithRetry(2, controller.signal)
            : null;
        const groupResult = await groupsRequest;
        const initialBreeds = mergeBreedPages([
          { page: 1, breeds: firstPage.breeds },
          ...(secondPage ? [{ page: 2, breeds: secondPage.breeds }] : []),
        ]);
        const initialPageCount = secondPage ? 2 : 1;

        setState((current) => {
          if (preserveExistingCatalogue.current) {
            return current;
          }
          return {
            ...current,
            breeds: initialBreeds,
            groups: groupResult.groups,
            groupsUnavailable: groupResult.unavailable,
            totalRecords: firstPage.pagination.totalRecords,
            loadedPages: initialPageCount,
            totalPages,
            isLoading: false,
            isCompletingCatalogue: totalPages > initialPageCount,
            isCatalogueIncomplete: false,
            hasError: false,
            errorMessage: null,
          };
        });

        const remaining = await Promise.all(
          Array.from(
            { length: Math.max(totalPages - initialPageCount, 0) },
            (_, index) => index + initialPageCount + 1,
          ).map(async (pageNumber) => {
            const page = await fetchBreedPageWithRetry(
              pageNumber,
              controller.signal,
            );
            return { page: pageNumber, breeds: page.breeds };
          }),
        );
        const breeds = mergeBreedPages([
          { page: 1, breeds: firstPage.breeds },
          ...(secondPage ? [{ page: 2, breeds: secondPage.breeds }] : []),
          ...remaining,
        ]);
        setState({
          breeds,
          groups: groupResult.groups,
          groupsUnavailable: groupResult.unavailable,
          totalRecords: firstPage.pagination.totalRecords,
          loadedPages: totalPages,
          totalPages,
          isLoading: false,
          isRefreshing: false,
          isCompletingCatalogue: false,
          isCatalogueIncomplete: false,
          hasError: false,
          errorMessage: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          isLoading: false,
          isRefreshing: false,
          isCompletingCatalogue: false,
          isCatalogueIncomplete:
            preservedCatalogueWasIncomplete.current ||
            (!preserveExistingCatalogue.current &&
              current.breeds.length > 0 &&
              current.loadedPages < (current.totalPages ?? 0)),
          hasError: current.breeds.length === 0,
          errorMessage:
            error instanceof Error ? error.message : "Unknown catalogue error",
        }));
      });

    return () => controller.abort();
  }, [requestKey]);

  useEffect(() => {
    if (backgroundRetryKey === 0) return;
    const controller = new AbortController();
    const totalPages = backgroundTotalPages.current;
    if (totalPages === null || totalPages <= 2) return;
    void Promise.all(
      Array.from({ length: totalPages - 2 }, (_, index) => index + 3).map(
        async (pageNumber) => {
          const page = await fetchBreedPageWithRetry(
            pageNumber,
            controller.signal,
          );
          return { page: pageNumber, breeds: page.breeds };
        },
      ),
    )
      .then((remaining) => {
        setState((current) => ({
          ...current,
          breeds: mergeBreedPages([
            { page: 1, breeds: current.breeds },
            ...remaining,
          ]),
          loadedPages: totalPages,
          isCompletingCatalogue: false,
          isCatalogueIncomplete: false,
          errorMessage: null,
        }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          isCompletingCatalogue: false,
          isCatalogueIncomplete: true,
          errorMessage:
            error instanceof Error ? error.message : "Unknown catalogue error",
        }));
      });

    return () => controller.abort();
  }, [backgroundRetryKey]);

  const retry = useCallback(() => {
    preserveExistingCatalogue.current = false;
    preservedCatalogueWasIncomplete.current = false;
    setState((current) => ({
      ...current,
      isLoading: current.breeds.length === 0,
      hasError: false,
      errorMessage: null,
      isCatalogueIncomplete: false,
    }));
    setRequestKey((key) => key + 1);
  }, []);
  const refresh = useCallback(() => {
    preserveExistingCatalogue.current = true;
    preservedCatalogueWasIncomplete.current =
      state.isCatalogueIncomplete || state.isCompletingCatalogue;
    setState((current) => ({
      ...current,
      isRefreshing: true,
      loadedPages: 0,
      errorMessage: null,
    }));
    setRequestKey((key) => key + 1);
  }, [state.isCatalogueIncomplete, state.isCompletingCatalogue]);

  const retryBackground = useCallback(() => {
    backgroundTotalPages.current = state.totalPages;
    setState((current) => ({
      ...current,
      loadedPages: Math.min(2, current.loadedPages),
      errorMessage: null,
      isCompletingCatalogue: true,
    }));
    setBackgroundRetryKey((key) => key + 1);
  }, [state.totalPages]);

  return { state, retry, refresh, retryBackground };
}
