import type { Breed } from '../../api/breeds';
import { deriveCoatCategory, deriveSizeBand, emptyBreedFilters, filterBreeds } from './breedFilters';

const breed: Breed = {
  id: 'one', name: 'German Shepherd', lifeMin: 9, lifeMax: 13,
  hypoallergenic: false, thumbnailUrl: null, otherNames: ['Alsatian'], groupId: 'herding',
  maximumWeight: 40, coatLength: 'medium', coatType: 'wire',
  socialTraits: { goodWithChildren: 5, goodWithDogs: 3, goodWithStrangers: 2 },
};

describe('breed filtering', () => {
  it('searches alternate names case-insensitively', () => {
    expect(filterBreeds([breed], 'alsat', emptyBreedFilters)).toEqual([breed]);
  });
  it('combines categories and applies trait thresholds', () => {
    const filters = { ...emptyBreedFilters, groupIds: ['herding'], sizes: ['large' as const], goodWithChildren: 5 };
    expect(filterBreeds([breed], '', filters)).toEqual([breed]);
    expect(filterBreeds([breed], '', { ...filters, goodWithDogs: 4 })).toEqual([]);
  });
  it('derives size and gives wire coat precedence', () => {
    expect(deriveSizeBand(10)).toBe('small');
    expect(deriveSizeBand(46)).toBe('giant');
    expect(deriveCoatCategory(breed)).toBe('wire');
  });
});
