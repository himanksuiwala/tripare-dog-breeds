import type { Breed } from "../../api/breeds";
import { mergeBreedPages } from "./useBreedCatalogueHelpers";

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
