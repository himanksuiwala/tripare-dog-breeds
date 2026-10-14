const BREEDS_ENDPOINT = "https://dogapi.dog/api/v2/breeds";

export type Range = {
  min: number;
  max: number;
};

export type BreedTraits = {
  energy: number;
  barking: number;
  drooling: number;
  grooming: number;
  shedding: number;
  trainability: number;
  goodWithDogs: number;
  exerciseMinutes: number;
  apartmentFriendly: number;
  goodWithChildren: number;
  goodWithStrangers: number;
  temperament: string[];
};

export type BreedImage = {
  id: string;
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  attribution: {
    author?: string;
    license?: string;
    source?: string;
  } | null;
};

export type BreedDetails = {
  id: string;
  name: string;
  description: string;
  life: Range;
  maleWeight: Range;
  femaleWeight: Range;
  maleHeight: Range;
  femaleHeight: Range;
  origin: {
    era?: string;
    region?: string;
    country?: string;
  };
  otherNames: string[];
  recognizedBy: string[];
  traits: BreedTraits;
  images: BreedImage[];
};

export class BreedNotFoundError extends Error {
  constructor() {
    super("Breed not found.");
    this.name = "BreedNotFoundError";
  }
}

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

function parseRange(value: unknown, fieldName: string): Range {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.min) ||
    !isFiniteNumber(value.max)
  ) {
    throw new Error(`Dog API returned invalid ${fieldName} data.`);
  }

  return { min: value.min, max: value.max };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
    : [];
}

function traitScore(traits: Record<string, unknown>, key: string): number {
  const value = traits[key];
  if (!isFiniteNumber(value)) {
    throw new Error(`Dog API returned invalid ${key} trait data.`);
  }
  return value;
}

function parseTraits(value: unknown): BreedTraits {
  if (!isRecord(value)) {
    throw new Error("Dog API returned invalid traits data.");
  }

  return {
    energy: traitScore(value, "energy"),
    barking: traitScore(value, "barking"),
    drooling: traitScore(value, "drooling"),
    grooming: traitScore(value, "grooming"),
    shedding: traitScore(value, "shedding"),
    trainability: traitScore(value, "trainability"),
    goodWithDogs: traitScore(value, "good_with_dogs"),
    exerciseMinutes: traitScore(value, "exercise_minutes"),
    apartmentFriendly: traitScore(value, "apartment_friendly"),
    goodWithChildren: traitScore(value, "good_with_children"),
    goodWithStrangers: traitScore(value, "good_with_strangers"),
    temperament: stringArray(value.temperament),
  };
}

function parseImages(value: unknown): BreedImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((image) => {
    if (
      !isRecord(image) ||
      typeof image.id !== "string" ||
      typeof image.thumb !== "string" ||
      typeof image.medium !== "string"
    ) {
      return [];
    }

    const attribution = image.attribution;
    const author = isRecord(attribution)
      ? optionalString(attribution.author)
      : undefined;
    const license = isRecord(attribution)
      ? optionalString(attribution.license)
      : undefined;
    const source = isRecord(attribution)
      ? optionalString(attribution.source)
      : undefined;
    const parsedAttribution =
      author || license || source ? { author, license, source } : null;

    return [
      {
        id: image.id,
        thumbUrl: image.thumb,
        mediumUrl: image.medium,
        largeUrl: typeof image.large === "string" ? image.large : image.medium,
        attribution: parsedAttribution,
      },
    ];
  });
}

export function parseBreedDetailsRecord(value: unknown): BreedDetails {
  if (!isRecord(value)) {
    throw new Error("Dog API returned invalid breed details.");
  }

  const data = value;
  const attributes = data.attributes;
  if (
    typeof data.id !== "string" ||
    !isRecord(attributes) ||
    typeof attributes.name !== "string" ||
    typeof attributes.description !== "string"
  ) {
    throw new Error("Dog API returned invalid breed details.");
  }

  const origin = isRecord(attributes.origin) ? attributes.origin : {};

  return {
    id: data.id,
    name: attributes.name,
    description: attributes.description,
    life: parseRange(attributes.life, "life span"),
    maleWeight: parseRange(attributes.male_weight, "male weight"),
    femaleWeight: parseRange(attributes.female_weight, "female weight"),
    maleHeight: parseRange(attributes.male_height, "male height"),
    femaleHeight: parseRange(attributes.female_height, "female height"),
    origin: {
      era: optionalString(origin.era),
      region: optionalString(origin.region),
      country: optionalString(origin.country),
    },
    otherNames: stringArray(attributes.other_names),
    recognizedBy: stringArray(attributes.recognized_by),
    traits: parseTraits(attributes.traits),
    images: parseImages(attributes.images),
  };
}

export function parseBreedDetails(value: unknown): BreedDetails {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("Dog API returned an invalid response.");
  }
  return parseBreedDetailsRecord(value.data);
}

export async function fetchBreedDetails(
  breedId: string,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<BreedDetails> {
  const response = await fetcher(
    `${BREEDS_ENDPOINT}/${encodeURIComponent(breedId)}`,
    { signal },
  );

  if (response.status === 404) {
    throw new BreedNotFoundError();
  }

  if (!response.ok) {
    throw new Error(`Dog API request failed with status ${response.status}.`);
  }

  return parseBreedDetails(await response.json());
}
