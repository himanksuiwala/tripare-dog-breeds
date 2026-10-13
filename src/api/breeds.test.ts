import { BREEDS_PAGE_SIZE, fetchBreedPage, parseBreedPage } from "./breeds";

const validResponse = {
  data: [
    {
      id: "breed-1",
      attributes: {
        name: "Affenpinscher",
        life: { min: 14, max: 16 },
        hypoallergenic: true,
        images: [{ thumb: "https://images.example/affenpinscher.jpg" }],
      },
    },
  ],
  meta: {
    pagination: { current: 1, next: 2, last: 6, records: 283 },
  },
};

describe("parseBreedPage", () => {
  it("maps breeds and pagination metadata", () => {
    expect(parseBreedPage(validResponse)).toEqual({
      breeds: [
        {
          id: "breed-1",
          name: "Affenpinscher",
          lifeMin: 14,
          lifeMax: 16,
          hypoallergenic: true,
          thumbnailUrl: "https://images.example/affenpinscher.jpg",
          otherNames: [],
          groupId: null,
          maximumWeight: null,
          coatLength: null,
          coatType: null,
          socialTraits: null,
        },
      ],
      pagination: {
        currentPage: 1,
        nextPage: 2,
        lastPage: 6,
        totalRecords: 283,
      },
    });
  });

  it("skips malformed breed records while preserving a valid page", () => {
    const response = {
      ...validResponse,
      data: [...validResponse.data, { id: "broken", attributes: {} }],
    };

    expect(parseBreedPage(response).breeds).toHaveLength(1);
  });

  it("uses the first non-empty thumbnail across all image items", () => {
    const response = {
      ...validResponse,
      data: [
        {
          ...validResponse.data[0],
          attributes: {
            ...validResponse.data[0].attributes,
            images: [
              { thumb: "" },
              { medium: "https://images.example/medium.jpg" },
              { thumb: "https://images.example/fallback-thumb.jpg" },
            ],
          },
        },
      ],
    };

    expect(parseBreedPage(response).breeds[0]?.thumbnailUrl).toBe(
      "https://images.example/fallback-thumb.jpg",
    );
  });

  it("rejects malformed pagination metadata", () => {
    expect(() =>
      parseBreedPage({ data: [], meta: { pagination: { current: "one" } } }),
    ).toThrow("invalid pagination");
  });

  it("accepts a final page regardless of its optional next-page sentinel", () => {
    const finalPage = {
      ...validResponse,
      meta: { pagination: { current: 6, prev: 5, records: 283 } },
    };

    expect(parseBreedPage(finalPage).pagination).toEqual({
      currentPage: 6,
      nextPage: null,
      lastPage: 6,
      totalRecords: 283,
    });
  });

  it("normalizes numeric pagination strings returned by the native request path", () => {
    const page = {
      ...validResponse,
      meta: { pagination: { current: "6", last: "6", records: "283" } },
    };
    expect(parseBreedPage(page).pagination).toEqual({
      currentPage: 6,
      nextPage: null,
      lastPage: 6,
      totalRecords: 283,
    });
  });
});

describe("fetchBreedPage", () => {
  it("requests the selected page with the agreed page size", async () => {
    const fetcher = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => validResponse,
    }));

    await fetchBreedPage(3, undefined, fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      `https://dogapi.dog/api/v2/breeds?page[number]=3&page[size]=${BREEDS_PAGE_SIZE}`,
      { signal: undefined },
    );
  });
});
