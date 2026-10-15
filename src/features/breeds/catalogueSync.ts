import { Image } from "expo-image";

import type { BreedDetails } from "../../api/breedDetails";
import {
  BREEDS_PAGE_SIZE,
  fetchBreedGroups,
  fetchBreedPage,
  type Breed,
  type BreedGroup,
} from "../../api/breeds";
import {
  readCachedCatalogue,
  replaceCachedCatalogue,
} from "../../data/catalogueDatabase";
import { mergeBreedPages } from "./useBreedCatalogueHelpers";

export type CatalogueSyncProgress = {
  breeds: Breed[];
  details: BreedDetails[];
  groups: BreedGroup[];
  groupsUnavailable: boolean;
  loadedPages: number;
  totalPages: number;
  totalRecords: number;
};

export type CatalogueSyncResult = CatalogueSyncProgress & {
  lastSuccessfulSyncAt: number;
};

let activeSync: Promise<CatalogueSyncResult> | null = null;

function prefetchThumbnails(breeds: Breed[]): void {
  const urls = breeds.flatMap((breed) =>
    breed.thumbnailUrl ? [breed.thumbnailUrl] : [],
  );
  const batchSize = 24;
  void (async () => {
    for (let index = 0; index < urls.length; index += batchSize) {
      await Image.prefetch(urls.slice(index, index + batchSize), "disk");
    }
  })();
}

function mergeDetails(pages: { details?: BreedDetails[] }[]): BreedDetails[] {
  const detailsById = new Map<string, BreedDetails>();
  for (const page of pages) {
    for (const details of page.details ?? []) {
      detailsById.set(details.id, details);
    }
  }
  return [...detailsById.values()];
}

export function synchronizeCatalogue(
  onProgress?: (progress: CatalogueSyncProgress) => void,
): Promise<CatalogueSyncResult> {
  if (activeSync) return activeSync;
  activeSync = runCatalogueSync(onProgress).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

async function runCatalogueSync(
  onProgress?: (progress: CatalogueSyncProgress) => void,
): Promise<CatalogueSyncResult> {
  const controller = new AbortController();
  const cached = await readCachedCatalogue();
  const groupResultPromise = fetchBreedGroups(controller.signal)
    .then((groups) => ({ groups, unavailable: false }))
    .catch(() => ({ groups: cached.groups, unavailable: true }));
  const pages: {
    page: number;
    breeds: Breed[];
    details?: BreedDetails[];
  }[] = [];
  let expectedTotalPages: number | null = null;
  let expectedTotalRecords: number | null = null;

  try {
    const firstPage = await fetchBreedPage(1, controller.signal);
    pages.push({ page: 1, ...firstPage });
    const totalPages = firstPage.pagination.lastPage;
    const totalRecords = firstPage.pagination.totalRecords;
    expectedTotalPages = totalPages;
    expectedTotalRecords = totalRecords;
    const groupResult = await groupResultPromise;

    const persistFirstRunProgress = async () => {
      if (cached.breeds.length > 0) return;
      await replaceCachedCatalogue(
        {
          breeds: mergeBreedPages(pages),
          details: mergeDetails(pages),
          groups: groupResult.unavailable ? null : groupResult.groups,
          totalRecords,
          totalPages,
          loadedPages: pages.length,
          isComplete: false,
        },
        BREEDS_PAGE_SIZE,
      );
    };

    await persistFirstRunProgress();
    onProgress?.({
      breeds: firstPage.breeds,
      details: firstPage.details ?? [],
      groups: groupResult.groups,
      groupsUnavailable: groupResult.unavailable,
      loadedPages: 1,
      totalPages,
      totalRecords,
    });

    for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
      const page = await fetchBreedPage(pageNumber, controller.signal);
      pages.push({ page: pageNumber, ...page });
      await persistFirstRunProgress();
      onProgress?.({
        breeds: mergeBreedPages(pages),
        details: mergeDetails(pages),
        groups: groupResult.groups,
        groupsUnavailable: groupResult.unavailable,
        loadedPages: pageNumber,
        totalPages,
        totalRecords,
      });
    }

    const breeds = mergeBreedPages(pages);
    const details = mergeDetails(pages);
    await replaceCachedCatalogue(
      {
        breeds,
        details,
        groups: groupResult.unavailable ? null : groupResult.groups,
        totalRecords,
        totalPages,
        loadedPages: totalPages,
        isComplete: true,
      },
      BREEDS_PAGE_SIZE,
    );
    prefetchThumbnails(breeds);
    const refreshed = await readCachedCatalogue();
    return {
      breeds: refreshed.breeds,
      details,
      groups: refreshed.groups,
      groupsUnavailable: groupResult.unavailable,
      loadedPages: totalPages,
      totalPages,
      totalRecords,
      lastSuccessfulSyncAt: refreshed.lastSuccessfulSyncAt ?? Date.now(),
    };
  } catch (error: unknown) {
    if (cached.breeds.length === 0 && pages.length > 0) {
      const groupResult = await groupResultPromise;
      const partialBreeds = mergeBreedPages(pages);
      await replaceCachedCatalogue(
        {
          breeds: partialBreeds,
          details: mergeDetails(pages),
          groups: groupResult.unavailable ? null : groupResult.groups,
          totalRecords: expectedTotalRecords ?? partialBreeds.length,
          totalPages: expectedTotalPages ?? pages.length,
          loadedPages: pages.length,
          isComplete: false,
        },
        BREEDS_PAGE_SIZE,
      );
    }
    throw error;
  }
}
