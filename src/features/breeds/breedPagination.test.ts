import type { BreedPage } from "../../api/breeds";
import {
  breedPaginationReducer,
  initialBreedPaginationState,
} from "./breedPagination";

function page(id: string, nextPage: number | null): BreedPage {
  return {
    breeds: [
      {
        id,
        name: `Breed ${id}`,
        lifeMin: 10,
        lifeMax: 12,
        hypoallergenic: false,
        thumbnailUrl: null,
        otherNames: [],
        groupId: null,
        maximumWeight: null,
        coatLength: null,
        coatType: null,
        socialTraits: null,
      },
    ],
    pagination: {
      currentPage: nextPage === null ? 6 : nextPage - 1,
      nextPage,
      lastPage: 6,
      totalRecords: 283,
    },
  };
}

describe("breedPaginationReducer", () => {
  it("replaces data after the first page or refresh", () => {
    const state = breedPaginationReducer(initialBreedPaginationState, {
      type: "replace-success",
      page: page("one", 2),
    });

    expect(state.breeds.map((breed) => breed.id)).toEqual(["one"]);
    expect(state.totalRecords).toBe(283);
    expect(state.nextPage).toBe(2);
    expect(state.isInitialLoading).toBe(false);
  });

  it("appends new pages without duplicating breeds", () => {
    const firstState = breedPaginationReducer(initialBreedPaginationState, {
      type: "replace-success",
      page: page("one", 2),
    });
    const duplicateState = breedPaginationReducer(firstState, {
      type: "append-success",
      page: page("one", 3),
    });
    const finalState = breedPaginationReducer(duplicateState, {
      type: "append-success",
      page: page("two", null),
    });

    expect(finalState.breeds.map((breed) => breed.id)).toEqual(["one", "two"]);
    expect(finalState.nextPage).toBeNull();
  });

  it("keeps loaded breeds when a later page fails", () => {
    const loadedState = breedPaginationReducer(initialBreedPaginationState, {
      type: "replace-success",
      page: page("one", 2),
    });
    const failedState = breedPaginationReducer(loadedState, {
      type: "append-failure",
      message: "Network unavailable",
    });

    expect(failedState.breeds).toEqual(loadedState.breeds);
    expect(failedState.paginationError).toBe("Network unavailable");
    expect(failedState.nextPage).toBe(2);
  });

  it("clears pagination loading when refresh takes over", () => {
    const appendingState = breedPaginationReducer(initialBreedPaginationState, {
      type: "append-start",
    });
    const refreshingState = breedPaginationReducer(appendingState, {
      type: "refresh-start",
    });

    expect(refreshingState.isLoadingMore).toBe(false);
    expect(refreshingState.isRefreshing).toBe(true);
  });
});
