import { useCallback, useEffect, useState } from "react";

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
  hasError: false,
  errorMessage: null,
};

export function mergeBreedPages(
  pages: { page: number; breeds: Breed[] }[],
): Breed[] {
  const unique = new Map<string, Breed>();
  for (const result of pages.sort((a, b) => a.page - b.page)) {
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

  useEffect(() => {
    const controller = new AbortController();
    const groupsRequest = fetchBreedGroups(controller.signal)
      .then((groups) => ({ groups, unavailable: false }))
      .catch(() => ({ groups: [] as BreedGroup[], unavailable: true }));

    void fetchBreedPageWithRetry(1, controller.signal)
      .then(async (firstPage) => {
        const totalPages = firstPage.pagination.lastPage;
        setState((current) => ({
          ...current,
          loadedPages: 1,
          totalPages,
          totalRecords: firstPage.pagination.totalRecords,
        }));

        const remaining = await Promise.all(
          Array.from(
            { length: Math.max(totalPages - 1, 0) },
            (_, index) => index + 2,
          ).map(async (pageNumber) => {
            const page = await fetchBreedPageWithRetry(
              pageNumber,
              controller.signal,
            );
            setState((current) => ({
              ...current,
              loadedPages: current.loadedPages + 1,
            }));
            return { page: pageNumber, breeds: page.breeds };
          }),
        );
        const groupResult = await groupsRequest;
        const breeds = mergeBreedPages([
          { page: 1, breeds: firstPage.breeds },
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
          hasError: current.breeds.length === 0,
          errorMessage:
            error instanceof Error ? error.message : "Unknown catalogue error",
        }));
      });

    return () => controller.abort();
  }, [requestKey]);

  const retry = useCallback(() => {
    setState((current) => ({
      ...current,
      isLoading: current.breeds.length === 0,
      hasError: false,
      errorMessage: null,
    }));
    setRequestKey((key) => key + 1);
  }, []);
  const refresh = useCallback(() => {
    setState((current) => ({ ...current, isRefreshing: true, loadedPages: 0 }));
    setRequestKey((key) => key + 1);
  }, []);

  return { state, retry, refresh };
}
