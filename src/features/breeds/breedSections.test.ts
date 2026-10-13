import type { Breed } from "../../api/breeds";
import { buildBreedSections } from "./breedSections";

function breed(id: string, name: string, groupId: string | null): Breed {
  return {
    id,
    name,
    lifeMin: 10,
    lifeMax: 12,
    hypoallergenic: false,
    thumbnailUrl: null,
    otherNames: [],
    groupId,
    maximumWeight: null,
    coatLength: null,
    coatType: null,
    socialTraits: null,
  };
}

describe("breed sections", () => {
  it("uses canonical section order and alphabetizes breeds", () => {
    const sections = buildBreedSections(
      [
        breed("beagle", "Beagle", "hound"),
        breed("akita", "Akita", "working"),
        breed("afghan", "Afghan Hound", "hound"),
        breed("collie", "Border Collie", "herding"),
      ],
      [
        { id: "working", name: "Working Group" },
        { id: "hound", name: "Hound Group" },
        { id: "herding", name: "Herding Group" },
      ],
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Herding",
      "Hound",
      "Working",
    ]);
    expect(sections[1]?.data.map((item) => item.name)).toEqual([
      "Afghan Hound",
      "Beagle",
    ]);
  });

  it("places breeds with unresolved groups in Other and omits empty groups", () => {
    const unknownBreed = breed("unknown", "Mystery Dog", "missing");

    expect(
      buildBreedSections(
        [unknownBreed],
        [{ id: "hound", name: "Hound Group" }],
      ),
    ).toEqual([{ title: "Other", data: [unknownBreed] }]);
  });
});
