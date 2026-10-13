import type { Breed, BreedPage } from "../../api/breeds";

export type BreedPaginationState = {
  breeds: Breed[];
  totalRecords: number | null;
  nextPage: number | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  initialError: string | null;
  paginationError: string | null;
};

export const initialBreedPaginationState: BreedPaginationState = {
  breeds: [],
  totalRecords: null,
  nextPage: 1,
  isInitialLoading: true,
  isRefreshing: false,
  isLoadingMore: false,
  initialError: null,
  paginationError: null,
};

export type BreedPaginationAction =
  | { type: "initial-start" }
  | { type: "refresh-start" }
  | { type: "append-start" }
  | { type: "replace-success"; page: BreedPage }
  | { type: "append-success"; page: BreedPage }
  | { type: "initial-failure"; message: string }
  | { type: "refresh-failure" }
  | { type: "append-failure"; message: string };

function uniqueBreeds(existing: Breed[], incoming: Breed[]): Breed[] {
  const breedsById = new Map(existing.map((breed) => [breed.id, breed]));
  for (const breed of incoming) {
    breedsById.set(breed.id, breed);
  }
  return [...breedsById.values()];
}

export function breedPaginationReducer(
  state: BreedPaginationState,
  action: BreedPaginationAction,
): BreedPaginationState {
  switch (action.type) {
    case "initial-start":
      return {
        ...state,
        isInitialLoading: true,
        initialError: null,
      };
    case "refresh-start":
      return {
        ...state,
        isRefreshing: true,
        isLoadingMore: false,
        paginationError: null,
      };
    case "append-start":
      return {
        ...state,
        isLoadingMore: true,
        paginationError: null,
      };
    case "replace-success":
      return {
        ...state,
        breeds: action.page.breeds,
        totalRecords: action.page.pagination.totalRecords,
        nextPage: action.page.pagination.nextPage,
        isInitialLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        initialError: null,
        paginationError: null,
      };
    case "append-success":
      return {
        ...state,
        breeds: uniqueBreeds(state.breeds, action.page.breeds),
        totalRecords: action.page.pagination.totalRecords,
        nextPage: action.page.pagination.nextPage,
        isLoadingMore: false,
        paginationError: null,
      };
    case "initial-failure":
      return {
        ...state,
        isInitialLoading: false,
        initialError: action.message,
      };
    case "refresh-failure":
      return {
        ...state,
        isRefreshing: false,
      };
    case "append-failure":
      return {
        ...state,
        isLoadingMore: false,
        paginationError: action.message,
      };
  }
}
