import { BreedNotFoundError, fetchBreedDetails, parseBreedDetails } from './breedDetails';

const validResponse = {
  data: {
    id: 'breed-1',
    attributes: {
      name: 'Affenpinscher',
      description: 'A small companion breed.',
      life: { min: 14, max: 16 },
      male_weight: { min: 4, max: 6 },
      female_weight: { min: 4, max: 6 },
      male_height: { min: 23, max: 29 },
      female_height: { min: 23, max: 29 },
      origin: { country: 'Germany' },
      other_names: [],
      recognized_by: ['AKC'],
      traits: {
        energy: 3,
        barking: 3,
        drooling: 1,
        grooming: 3,
        shedding: 2,
        trainability: 3,
        good_with_dogs: 3,
        exercise_minutes: 30,
        apartment_friendly: 5,
        good_with_children: 3,
        good_with_strangers: 2,
        temperament: ['curious'],
      },
      images: [
        {
          id: 'image-1',
          thumb: 'https://images.example/thumb.webp',
          medium: 'https://images.example/medium.webp',
          large: 'https://images.example/large.webp',
          attribution: {
            author: 'Example Author',
            license: 'CC BY 2.0',
            source: 'Wikimedia Commons',
          },
        },
      ],
    },
  },
};

describe('parseBreedDetails', () => {
  it('maps details while allowing optional origin fields and empty arrays', () => {
    const details = parseBreedDetails(validResponse);

    expect(details.name).toBe('Affenpinscher');
    expect(details.origin).toEqual({
      country: 'Germany',
      era: undefined,
      region: undefined,
    });
    expect(details.otherNames).toEqual([]);
    expect(details.images).toEqual([
      {
        id: 'image-1',
        thumbUrl: 'https://images.example/thumb.webp',
        mediumUrl: 'https://images.example/medium.webp',
        largeUrl: 'https://images.example/large.webp',
        attribution: {
          author: 'Example Author',
          license: 'CC BY 2.0',
          source: 'Wikimedia Commons',
        },
      },
    ]);
    expect(details.traits.exerciseMinutes).toBe(30);
  });

  it('rejects malformed required measurements', () => {
    const malformed = {
      ...validResponse,
      data: {
        ...validResponse.data,
        attributes: { ...validResponse.data.attributes, life: { min: 'old', max: 16 } },
      },
    };

    expect(() => parseBreedDetails(malformed)).toThrow('life span');
  });
});

describe('fetchBreedDetails', () => {
  it('handles the API HTML 404 without attempting to parse it', async () => {
    const json = jest.fn(async () => ({}));
    const fetcher = jest.fn(async () => ({ ok: false, status: 404, json }));

    await expect(fetchBreedDetails('missing', undefined, fetcher)).rejects.toBeInstanceOf(
      BreedNotFoundError,
    );
    expect(json).not.toHaveBeenCalled();
  });
});
