import { BREEDS_PAGE_SIZE, fetchBreedPage, parseBreedPage } from './breeds';

const validResponse = {
  data: [
    {
      id: 'breed-1',
      attributes: {
        name: 'Affenpinscher',
        life: { min: 14, max: 16 },
        hypoallergenic: true,
        images: [{ thumb: 'https://images.example/affenpinscher.jpg' }],
      },
    },
  ],
  meta: {
    pagination: { current: 1, next: 2, last: 6, records: 283 },
  },
};

describe('parseBreedPage', () => {
  it('maps breeds and pagination metadata', () => {
    expect(parseBreedPage(validResponse)).toEqual({
      breeds: [
        {
          id: 'breed-1',
          name: 'Affenpinscher',
          lifeMin: 14,
          lifeMax: 16,
          hypoallergenic: true,
          thumbnailUrl: 'https://images.example/affenpinscher.jpg',
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

  it('skips malformed breed records while preserving a valid page', () => {
    const response = {
      ...validResponse,
      data: [...validResponse.data, { id: 'broken', attributes: {} }],
    };

    expect(parseBreedPage(response).breeds).toHaveLength(1);
  });

  it('rejects malformed pagination metadata', () => {
    expect(() =>
      parseBreedPage({ data: [], meta: { pagination: { current: 'one' } } }),
    ).toThrow('invalid pagination');
  });
});

describe('fetchBreedPage', () => {
  it('requests the selected page with the agreed page size', async () => {
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
