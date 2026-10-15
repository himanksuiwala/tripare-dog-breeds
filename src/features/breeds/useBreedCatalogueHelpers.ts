import type { Breed } from "../../api/breeds";

export function mergeBreedPages(
  pages: { page: number; breeds: Breed[] }[],
): Breed[] {
  const unique = new Map<string, Breed>();
  for (const result of [...pages].sort((a, b) => a.page - b.page)) {
    for (const breed of result.breeds) unique.set(breed.id, breed);
  }
  return [...unique.values()];
}
