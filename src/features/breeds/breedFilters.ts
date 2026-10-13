import type { Breed } from '../../api/breeds';

export type SizeBand = 'small' | 'medium' | 'large' | 'giant';
export type CoatCategory = 'short' | 'medium' | 'long' | 'wire' | 'hairless';
export type HypoallergenicFilter = 'any' | 'yes' | 'no';

export type BreedFilters = {
  groupIds: string[];
  sizes: SizeBand[];
  coats: CoatCategory[];
  hypoallergenic: HypoallergenicFilter;
  goodWithChildren: number | null;
  goodWithDogs: number | null;
  goodWithStrangers: number | null;
};

export const emptyBreedFilters: BreedFilters = {
  groupIds: [],
  sizes: [],
  coats: [],
  hypoallergenic: 'any',
  goodWithChildren: null,
  goodWithDogs: null,
  goodWithStrangers: null,
};

export function deriveSizeBand(weight: number | null): SizeBand | null {
  if (weight === null) return null;
  if (weight <= 10) return 'small';
  if (weight <= 25) return 'medium';
  if (weight <= 45) return 'large';
  return 'giant';
}

export function deriveCoatCategory(breed: Breed): CoatCategory | null {
  if (breed.coatType === 'wire') return 'wire';
  if (breed.coatType === 'hairless' || breed.coatLength === 'hairless') return 'hairless';
  return breed.coatLength === 'short' ||
    breed.coatLength === 'medium' ||
    breed.coatLength === 'long'
    ? breed.coatLength
    : null;
}

export function countActiveFilters(filters: BreedFilters): number {
  return (
    Number(filters.groupIds.length > 0) +
    Number(filters.sizes.length > 0) +
    Number(filters.coats.length > 0) +
    Number(filters.hypoallergenic !== 'any') +
    Number(filters.goodWithChildren !== null) +
    Number(filters.goodWithDogs !== null) +
    Number(filters.goodWithStrangers !== null)
  );
}

export function filterBreeds(
  breeds: Breed[],
  query: string,
  filters: BreedFilters,
): Breed[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return breeds.filter((breed) => {
    const matchesSearch =
      normalizedQuery.length === 0 ||
      [breed.name, ...breed.otherNames].some((name) =>
        name.toLocaleLowerCase().includes(normalizedQuery),
      );
    if (!matchesSearch) return false;
    if (filters.groupIds.length > 0 && (!breed.groupId || !filters.groupIds.includes(breed.groupId))) {
      return false;
    }
    const size = deriveSizeBand(breed.maximumWeight);
    if (filters.sizes.length > 0 && (!size || !filters.sizes.includes(size))) return false;
    const coat = deriveCoatCategory(breed);
    if (filters.coats.length > 0 && (!coat || !filters.coats.includes(coat))) return false;
    if (filters.hypoallergenic === 'yes' && !breed.hypoallergenic) return false;
    if (filters.hypoallergenic === 'no' && breed.hypoallergenic) return false;
    const traits = breed.socialTraits;
    if (filters.goodWithChildren !== null && (!traits || traits.goodWithChildren < filters.goodWithChildren)) return false;
    if (filters.goodWithDogs !== null && (!traits || traits.goodWithDogs < filters.goodWithDogs)) return false;
    if (filters.goodWithStrangers !== null && (!traits || traits.goodWithStrangers < filters.goodWithStrangers)) return false;
    return true;
  });
}
