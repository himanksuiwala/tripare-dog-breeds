import type { Breed, BreedGroup } from "../../api/breeds";

export type BreedSection = {
  title: string;
  data: Breed[];
};

const CANONICAL_GROUP_ORDER = [
  "Herding",
  "Hound",
  "Sporting",
  "Terrier",
  "Toy",
  "Working",
  "Non-Sporting",
  "Miscellaneous",
  "Foundation Stock Service",
] as const;

const OTHER_GROUP = "Other";

function displayGroupName(name: string): string {
  return name.replace(/ Group$| Class$/, "");
}

function sectionOrder(title: string): number {
  if (title === OTHER_GROUP) return Number.MAX_SAFE_INTEGER;
  const canonicalIndex = CANONICAL_GROUP_ORDER.findIndex(
    (group) => group === title,
  );
  return canonicalIndex === -1 ? CANONICAL_GROUP_ORDER.length : canonicalIndex;
}

export function buildBreedSections(
  breeds: Breed[],
  groups: BreedGroup[],
): BreedSection[] {
  const groupNamesById = new Map(
    groups.map((group) => [group.id, displayGroupName(group.name)]),
  );
  const breedsByGroup = new Map<string, Breed[]>();

  for (const breed of breeds) {
    const title =
      (breed.groupId ? groupNamesById.get(breed.groupId) : null) ?? OTHER_GROUP;
    const groupBreeds = breedsByGroup.get(title) ?? [];
    groupBreeds.push(breed);
    breedsByGroup.set(title, groupBreeds);
  }

  return [...breedsByGroup.entries()]
    .map(([title, data]) => ({
      title,
      data: [...data].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    }))
    .sort((left, right) => {
      const orderDifference =
        sectionOrder(left.title) - sectionOrder(right.title);
      return orderDifference || left.title.localeCompare(right.title);
    });
}
