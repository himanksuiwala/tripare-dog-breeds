import type { Breed, BreedPage } from "../../api/breeds";
import { fetchBreedPageWithLoader, mergeBreedPages } from "./useBreedCatalogue";

function breed(id: string): Breed {
  return {
    id,
    name: id,
    lifeMin: 1,
    lifeMax: 2,
    hypoallergenic: false,
    thumbnailUrl: null,
    otherNames: [],
    groupId: null,
    maximumWeight: null,
    coatLength: null,
    coatType: null,
    socialTraits: null,
  };
}

describe("mergeBreedPages", () => {
  it("orders pages and deduplicates breed IDs", () => {
    expect(
      mergeBreedPages([
        { page: 2, breeds: [breed("b"), breed("duplicate")] },
        { page: 1, breeds: [breed("a"), breed("duplicate")] },
      ]).map((item) => item.id),
    ).toEqual(["a", "duplicate", "b"]);
  });

  it("supports an initial two-page render followed by one complete merge", () => {
    const initialPages = [
      { page: 1, breeds: [breed("a")] },
      { page: 2, breeds: [breed("b")] },
    ];
    const initialBreeds = mergeBreedPages(initialPages);
    const completeBreeds = mergeBreedPages([
      ...initialPages,
      { page: 3, breeds: [breed("c")] },
      { page: 4, breeds: [breed("d")] },
    ]);

    expect(initialBreeds.map((item) => item.id)).toEqual(["a", "b"]);
    expect(completeBreeds.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
    expect(initialPages.map((page) => page.page)).toEqual([1, 2]);
  });
});

describe("fetchBreedPageWithLoader", () => {
  it("retries an individual failed page without discarding the catalogue", async () => {
    const page: BreedPage = {
      breeds: [breed("a")],
      pagination: {
        currentPage: 2,
        nextPage: 3,
        lastPage: 6,
        totalRecords: 283,
      },
    };
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(page);

    await expect(
      fetchBreedPageWithLoader(2, new AbortController().signal, 3, loader),
    ).resolves.toEqual(page);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
