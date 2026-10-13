const BREEDS_ENDPOINT = 'https://dogapi.dog/api/v2/breeds';

export const BREEDS_PAGE_SIZE = 48;

export type Breed = {
  id: string;
  name: string;
  lifeMin: number;
  lifeMax: number;
  hypoallergenic: boolean;
  thumbnailUrl: string | null;
};

export type BreedPage = {
  breeds: Breed[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    lastPage: number;
    totalRecords: number;
  };
};

type Fetcher = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseBreed(value: unknown): Breed | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const attributes = value.attributes;
  if (!isRecord(attributes)) {
    return null;
  }

  const life = attributes.life;
  if (
    typeof attributes.name !== 'string' ||
    typeof attributes.hypoallergenic !== 'boolean' ||
    !isRecord(life) ||
    !isFiniteNumber(life.min) ||
    !isFiniteNumber(life.max)
  ) {
    return null;
  }

  let thumbnailUrl: string | null = null;
  if (Array.isArray(attributes.images)) {
    const firstImage = attributes.images.find(
      (image): image is Record<string, unknown> => isRecord(image),
    );
    if (firstImage && typeof firstImage.thumb === 'string') {
      thumbnailUrl = firstImage.thumb;
    }
  }

  return {
    id: value.id,
    name: attributes.name,
    lifeMin: life.min,
    lifeMax: life.max,
    hypoallergenic: attributes.hypoallergenic,
    thumbnailUrl,
  };
}

export function parseBreedPage(value: unknown): BreedPage {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    throw new Error('Dog API returned an invalid response.');
  }

  const pagination = value.meta.pagination;
  if (
    !isRecord(pagination) ||
    !isFiniteNumber(pagination.current) ||
    !isFiniteNumber(pagination.last) ||
    !isFiniteNumber(pagination.records) ||
    !(
      pagination.next === null ||
      pagination.next === undefined ||
      isFiniteNumber(pagination.next)
    )
  ) {
    throw new Error('Dog API returned invalid pagination data.');
  }

  const breeds = value.data.flatMap((item) => {
    const breed = parseBreed(item);
    return breed ? [breed] : [];
  });

  return {
    breeds,
    pagination: {
      currentPage: pagination.current,
      nextPage: isFiniteNumber(pagination.next) ? pagination.next : null,
      lastPage: pagination.last,
      totalRecords: pagination.records,
    },
  };
}

export async function fetchBreedPage(
  page: number,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<BreedPage> {
  const url = `${BREEDS_ENDPOINT}?page[number]=${page}&page[size]=${BREEDS_PAGE_SIZE}`;
  const response = await fetcher(url, { signal });

  if (!response.ok) {
    throw new Error(`Dog API request failed with status ${response.status}.`);
  }

  return parseBreedPage(await response.json());
}
