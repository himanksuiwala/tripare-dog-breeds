import type { ReactNode } from "react";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import type {
  BreedDetails,
  BreedImage,
  BreedTraits,
  Range,
} from "../../../api/breedDetails";
import {
  EXERCISE_MINUTES_MAX,
  normalizeScale,
  TRAIT_SCALE_MAX,
} from "../traitScale";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-7">
      <Text className="mb-3 text-xl font-black text-doggo-ink">{title}</Text>
      {children}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm font-semibold text-doggo-muted">{label}</Text>
      <Text className="text-base font-bold text-doggo-ink">{value}</Text>
    </View>
  );
}

function ChipSection({ title, values }: { title: string; values: string[] }) {
  return (
    <Section title={title}>
      <View className="flex-row flex-wrap gap-2">
        {values.map((value) => (
          <View
            className="rounded-full bg-doggo-accent-soft px-3 py-2"
            key={value}
          >
            <Text className="text-sm font-semibold text-doggo-accent">
              {value}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

export function BreedOverviewTab({ details }: { details: BreedDetails }) {
  return (
    <View>
      <BreedHero details={details} />
      <Section title="About">
        <Text className="text-base leading-7 text-doggo-muted">
          {details.description}
        </Text>
      </Section>
      <Section title="At a glance">
        <View className="rounded-3xl border border-doggo-border bg-white p-4">
          <Metric
            label="Life span"
            value={`${details.life.min}–${details.life.max} years`}
          />
          <View className="my-4 h-px bg-doggo-border" />
          <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-doggo-muted">
            Weight
          </Text>
          <View className="flex-row gap-3">
            <MeasurementCard
              label="Male"
              range={details.maleWeight}
              unit="kg"
            />
            <MeasurementCard
              label="Female"
              range={details.femaleWeight}
              unit="kg"
            />
          </View>
          <Text className="mb-3 mt-5 text-xs font-bold uppercase tracking-wider text-doggo-muted">
            Height
          </Text>
          <View className="flex-row gap-3">
            <MeasurementCard
              label="Male"
              range={details.maleHeight}
              unit="cm"
            />
            <MeasurementCard
              label="Female"
              range={details.femaleHeight}
              unit="cm"
            />
          </View>
        </View>
      </Section>
      <Origin origin={details.origin} />
      {details.otherNames.length > 0 ? (
        <ChipSection title="Other names" values={details.otherNames} />
      ) : null}
      {details.recognizedBy.length > 0 ? (
        <ChipSection title="Recognized by" values={details.recognizedBy} />
      ) : null}
    </View>
  );
}

function BreedHero({ details }: { details: BreedDetails }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hero = details.images[0];
  const showFallback = !hero || failedUrl === hero.mediumUrl;

  return (
    <View className="mb-2 overflow-hidden rounded-3xl border border-doggo-border bg-white">
      {showFallback ? (
        <View className="h-64 items-center justify-center bg-doggo-accent-soft">
          <Text className="text-7xl font-black text-doggo-accent">
            {details.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      ) : (
        <Image
          accessibilityLabel={`${details.name} breed`}
          className="h-64 w-full bg-doggo-accent-soft"
          onError={() => setFailedUrl(hero.mediumUrl)}
          resizeMode="cover"
          source={{ uri: hero.mediumUrl }}
        />
      )}
      {hero?.attribution && !showFallback ? (
        <Text className="px-4 py-2 text-xs text-doggo-muted">
          {[
            hero.attribution.author,
            hero.attribution.license,
            hero.attribution.source,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}
    </View>
  );
}

function MeasurementCard({
  label,
  range,
  unit,
}: {
  label: string;
  range: Range;
  unit: string;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-doggo-canvas p-3">
      <Text className="text-xs font-semibold text-doggo-muted">{label}</Text>
      <Text className="mt-1 text-base font-black text-doggo-ink">
        {range.min}–{range.max} {unit}
      </Text>
    </View>
  );
}

function Origin({ origin }: { origin: BreedDetails["origin"] }) {
  const entries = [
    { label: "Country", value: origin.country },
    { label: "Region", value: origin.region },
    { label: "Era", value: origin.era },
  ].filter((entry): entry is { label: string; value: string } =>
    Boolean(entry.value),
  );

  return (
    <Section title="Origin">
      <View className="rounded-3xl border border-doggo-border bg-white p-4">
        {entries.length > 0 ? (
          entries.map((entry, index) => (
            <View key={entry.label}>
              {index > 0 ? (
                <View className="my-3 h-px bg-doggo-border" />
              ) : null}
              <Metric label={entry.label} value={entry.value} />
            </View>
          ))
        ) : (
          <Text className="text-base text-doggo-muted">Origin unavailable</Text>
        )}
      </View>
    </Section>
  );
}

type ScoredTraitKey = Exclude<
  keyof BreedTraits,
  "exerciseMinutes" | "temperament"
>;

const TRAIT_GROUPS: {
  title: string;
  traits: { key: ScoredTraitKey; label: string }[];
}[] = [
  {
    title: "Lifestyle",
    traits: [
      { key: "energy", label: "Energy" },
      { key: "barking", label: "Barking" },
      { key: "apartmentFriendly", label: "Apartment friendly" },
      { key: "trainability", label: "Trainability" },
    ],
  },
  {
    title: "Care",
    traits: [
      { key: "grooming", label: "Grooming needs" },
      { key: "shedding", label: "Shedding" },
      { key: "drooling", label: "Drooling" },
    ],
  },
  {
    title: "Social",
    traits: [
      { key: "goodWithChildren", label: "Good with children" },
      { key: "goodWithDogs", label: "Good with dogs" },
      { key: "goodWithStrangers", label: "Good with strangers" },
    ],
  },
];

export function BreedTraitsTab({ traits }: { traits: BreedTraits }) {
  return (
    <View>
      <ExerciseCard minutes={traits.exerciseMinutes} />
      {TRAIT_GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          <View className="rounded-3xl border border-doggo-border bg-white px-4">
            {group.traits.map((trait, index) => (
              <View key={trait.key}>
                {index > 0 ? <View className="h-px bg-doggo-border" /> : null}
                <TraitScale label={trait.label} value={traits[trait.key]} />
              </View>
            ))}
          </View>
        </Section>
      ))}
      {traits.temperament.length > 0 ? (
        <ChipSection title="Temperament" values={traits.temperament} />
      ) : null}
    </View>
  );
}

function TraitScale({ label, value }: { label: string; value: number }) {
  const filledSegments = Math.round(
    normalizeScale(value, TRAIT_SCALE_MAX) * TRAIT_SCALE_MAX,
  );
  return (
    <View
      accessibilityLabel={`${label}: ${value} out of ${TRAIT_SCALE_MAX}`}
      className="py-4"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-bold text-doggo-ink">{label}</Text>
        <Text className="text-xs font-semibold text-doggo-muted">
          {value}/5
        </Text>
      </View>
      <View className="flex-row gap-1.5">
        {Array.from({ length: TRAIT_SCALE_MAX }, (_, index) => (
          <View
            className={
              index < filledSegments
                ? "h-2 flex-1 rounded-full bg-doggo-accent"
                : "h-2 flex-1 rounded-full bg-doggo-skeleton"
            }
            key={index}
          />
        ))}
      </View>
    </View>
  );
}

function ExerciseCard({ minutes }: { minutes: number }) {
  const progress = normalizeScale(minutes, EXERCISE_MINUTES_MAX) * 100;
  return (
    <View className="rounded-3xl bg-doggo-accent p-5">
      <Text className="text-sm font-semibold text-white/80">
        Daily exercise
      </Text>
      <Text className="mt-1 text-3xl font-black text-white">
        {minutes} min/day
      </Text>
      <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/30">
        <View
          className="h-full rounded-full bg-white"
          style={{ width: `${progress}%` }}
        />
      </View>
    </View>
  );
}

export function BreedGalleryTab({
  details,
  onImagePress,
}: {
  details: BreedDetails;
  onImagePress: (imageId: string) => void;
}) {
  if (details.images.length === 0) {
    return (
      <View className="items-center justify-center px-8 py-24">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-doggo-accent-soft">
          <Text className="text-3xl text-doggo-accent">▧</Text>
        </View>
        <Text className="mt-5 text-center text-2xl font-black text-doggo-ink">
          No photos available
        </Text>
        <Text className="mt-2 text-center text-base leading-6 text-doggo-muted">
          This breed does not have gallery images yet.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {details.images.map((image, index) => (
        <GalleryThumbnail
          breedName={details.name}
          image={image}
          imageNumber={index + 1}
          key={image.id}
          onPress={() => onImagePress(image.id)}
        />
      ))}
    </View>
  );
}

function GalleryThumbnail({
  breedName,
  image,
  imageNumber,
  onPress,
}: {
  breedName: string;
  image: BreedImage;
  imageNumber: number;
  onPress: () => void;
}) {
  const [hasFailed, setHasFailed] = useState(false);
  return (
    <Pressable
      accessibilityLabel={`Open ${breedName} image ${imageNumber}`}
      accessibilityRole="button"
      className="aspect-square w-[31%] overflow-hidden rounded-2xl bg-doggo-accent-soft active:opacity-70"
      onPress={onPress}
    >
      {hasFailed ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-3xl font-black text-doggo-accent">
            {breedName.charAt(0).toUpperCase()}
          </Text>
        </View>
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          className="h-full w-full"
          onError={() => setHasFailed(true)}
          resizeMode="cover"
          source={{ uri: image.thumbUrl }}
        />
      )}
    </Pressable>
  );
}
