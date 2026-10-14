import { parseBreedDetailsRecord, type BreedDetails } from "./breedDetails";

const BREEDS_ENDPOINT = "https://dogapi.dog/api/v2/breeds";

export const BREEDS_PAGE_SIZE = 48;

export type Breed = {
  id: string;
  name: string;
  lifeMin: number;
  lifeMax: number;
  hypoallergenic: boolean;
  thumbnailUrl: string | null;
  otherNames: string[];
  groupId: string | null;
  maximumWeight: number | null;
  coatLength: string | null;
  coatType: string | null;
  socialTraits: {
    goodWithChildren: number;
    goodWithDogs: number;
    goodWithStrangers: number;
  } | null;
};

export type BreedGroup = { id: string; name: string };

export type BreedPage = {
  breeds: Breed[];
  details?: BreedDetails[];
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
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function paginationNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseBreed(value: unknown): Breed | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  const attributes = value.attributes;
  if (!isRecord(attributes)) {
    return null;
  }

  const life = attributes.life;
  if (
    typeof attributes.name !== "string" ||
    typeof attributes.hypoallergenic !== "boolean" ||
    !isRecord(life) ||
    !isFiniteNumber(life.min) ||
    !isFiniteNumber(life.max)
  ) {
    return null;
  }

  let thumbnailUrl: string | null = null;
  if (Array.isArray(attributes.images)) {
    const thumbnailImage = attributes.images.find(
      (image): image is Record<string, unknown> =>
        isRecord(image) &&
        typeof image.thumb === "string" &&
        image.thumb.trim().length > 0,
    );
    if (thumbnailImage && typeof thumbnailImage.thumb === "string") {
      thumbnailUrl = thumbnailImage.thumb.trim();
    }
  }

  const maleWeight = isRecord(attributes.male_weight)
    ? attributes.male_weight.max
    : null;
  const femaleWeight = isRecord(attributes.female_weight)
    ? attributes.female_weight.max
    : null;
  const weights = [maleWeight, femaleWeight].filter(isFiniteNumber);
  const coat = isRecord(attributes.coat) ? attributes.coat : {};
  const traits = isRecord(attributes.traits) ? attributes.traits : null;
  const relationships = isRecord(value.relationships)
    ? value.relationships
    : {};
  const group = isRecord(relationships.group) ? relationships.group : {};
  const groupData = isRecord(group.data) ? group.data : {};
  const hasSocialTraits =
    traits !== null &&
    isFiniteNumber(traits.good_with_children) &&
    isFiniteNumber(traits.good_with_dogs) &&
    isFiniteNumber(traits.good_with_strangers);

  return {
    id: value.id,
    name: attributes.name,
    lifeMin: life.min,
    lifeMax: life.max,
    hypoallergenic: attributes.hypoallergenic,
    thumbnailUrl,
    otherNames: Array.isArray(attributes.other_names)
      ? attributes.other_names.filter(
          (name): name is string => typeof name === "string",
        )
      : [],
    groupId: typeof groupData.id === "string" ? groupData.id : null,
    maximumWeight: weights.length > 0 ? Math.max(...weights) : null,
    coatLength: typeof coat.length === "string" ? coat.length : null,
    coatType: typeof coat.type === "string" ? coat.type : null,
    socialTraits: hasSocialTraits
      ? {
          goodWithChildren: traits.good_with_children as number,
          goodWithDogs: traits.good_with_dogs as number,
          goodWithStrangers: traits.good_with_strangers as number,
        }
      : null,
  };
}

export function parseBreedGroups(value: unknown): BreedGroup[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("Dog API returned invalid group data.");
  }

  return value.data.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !isRecord(item.attributes)
    ) {
      return [];
    }
    return typeof item.attributes.name === "string"
      ? [{ id: item.id, name: item.attributes.name }]
      : [];
  });
}

export async function fetchBreedGroups(
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<BreedGroup[]> {
  const response = await fetcher(
    "https://dogapi.dog/api/v2/groups?page[size]=1000",
    { signal },
  );
  if (!response.ok) {
    throw new Error(
      `Dog API group request failed with status ${response.status}.`,
    );
  }
  return parseBreedGroups(await response.json());
}

export function parseBreedPage(value: unknown): BreedPage {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    throw new Error("Dog API returned an invalid response.");
  }

  const pagination = value.meta.pagination;
  if (!isRecord(pagination)) {
    throw new Error("Dog API returned invalid pagination data.");
  }
  const currentPage = paginationNumber(pagination.current);
  const totalRecords = paginationNumber(pagination.records);
  const nextPage = paginationNumber(pagination.next);
  const explicitLastPage = paginationNumber(pagination.last);
  const lastPage = explicitLastPage ?? (nextPage === null ? currentPage : null);
  if (currentPage === null || lastPage === null || totalRecords === null) {
    throw new Error("Dog API returned invalid pagination data.");
  }

  const breeds = value.data.flatMap((item) => {
    const breed = parseBreed(item);
    return breed ? [breed] : [];
  });
  const details = value.data.flatMap((item) => {
    try {
      return [parseBreedDetailsRecord(item)];
    } catch {
      return [];
    }
  });

  return {
    breeds,
    ...(details.length > 0 ? { details } : {}),
    pagination: {
      currentPage,
      nextPage,
      lastPage,
      totalRecords,
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
