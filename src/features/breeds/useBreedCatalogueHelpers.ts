import { fetchBreedPage, type Breed, type BreedPage } from "../../api/breeds";

const CATALOGUE_REQUEST_ATTEMPTS = 3;

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
  loader: (page: number, signal?: AbortSignal) => Promise<BreedPage>,
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
