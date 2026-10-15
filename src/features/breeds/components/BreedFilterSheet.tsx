import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { Breed, BreedGroup } from "../../../api/breeds";
import { BottomSheetModal } from "../../../components/BottomSheetModal";
import {
  emptyBreedFilters,
  filterBreeds,
  type BreedFilters,
  type CoatCategory,
  type HypoallergenicFilter,
  type SizeBand,
} from "../breedFilters";

const SIZE_OPTIONS: { label: string; value: SizeBand }[] = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
  { label: "Giant", value: "giant" },
];

const COAT_OPTIONS: { label: string; value: CoatCategory }[] = [
  { label: "Short", value: "short" },
  { label: "Medium", value: "medium" },
  { label: "Long", value: "long" },
  { label: "Wire", value: "wire" },
  { label: "Hairless", value: "hairless" },
];

const HYPOALLERGENIC_OPTIONS: {
  label: string;
  value: HypoallergenicFilter;
}[] = [
  { label: "Any", value: "any" },
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const THRESHOLD_OPTIONS = [null, 1, 2, 3, 4, 5] as const;

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

type BreedFilterSheetProps = {
  breeds: Breed[];
  draft: BreedFilters;
  groups: BreedGroup[];
  groupsUnavailable: boolean;
  isVisible: boolean;
  onApply: (value: BreedFilters) => void;
  onChange: (value: BreedFilters) => void;
  onClose: () => void;
  query: string;
};

export function BreedFilterSheet({
  breeds,
  draft,
  groups,
  groupsUnavailable,
  isVisible,
  onApply,
  onChange,
  onClose,
  query,
}: BreedFilterSheetProps) {
  const matchingBreedCount = useMemo(
    () => filterBreeds(breeds, query, draft).length,
    [breeds, draft, query],
  );
  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        label: group.name.replace(/ Group$| Class$/, ""),
        value: group.id,
      })),
    [groups],
  );

  return (
    <BottomSheetModal
      footer={
        <View className="flex-row items-stretch gap-3">
          <Pressable
            accessibilityRole="button"
            className="h-14 flex-[0.9] items-center justify-center rounded-2xl border border-doggo-border bg-white px-4 active:opacity-70"
            onPress={() => onChange(emptyBreedFilters)}
          >
            <Text className="text-base font-bold text-doggo-ink">
              Clear all
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="h-14 flex-[1.7] items-center justify-center rounded-2xl bg-doggo-accent px-4 active:opacity-80"
            onPress={() => onApply(draft)}
          >
            <Text
              className="text-center text-base font-bold text-white"
              numberOfLines={1}
            >
              Show {matchingBreedCount} breeds
            </Text>
          </Pressable>
        </View>
      }
      isVisible={isVisible}
      onClose={onClose}
      title="Filter breeds"
    >
      <ScrollView contentContainerClassName="px-6 pb-6">
        <FilterSection title="Breed group">
          {groupsUnavailable ? (
            <Text className="text-doggo-muted">Groups unavailable</Text>
          ) : (
            <Chips
              items={groupOptions}
              selected={draft.groupIds}
              onToggle={(value) =>
                onChange({
                  ...draft,
                  groupIds: toggleValue(draft.groupIds, value),
                })
              }
            />
          )}
        </FilterSection>
        <FilterSection title="Size">
          <Chips
            items={SIZE_OPTIONS}
            selected={draft.sizes}
            onToggle={(value) =>
              onChange({ ...draft, sizes: toggleValue(draft.sizes, value) })
            }
          />
        </FilterSection>
        <FilterSection title="Coat">
          <Chips
            items={COAT_OPTIONS}
            selected={draft.coats}
            onToggle={(value) =>
              onChange({ ...draft, coats: toggleValue(draft.coats, value) })
            }
          />
        </FilterSection>
        <FilterSection title="Hypoallergenic">
          <Chips
            items={HYPOALLERGENIC_OPTIONS}
            selected={[draft.hypoallergenic]}
            onToggle={(value) => onChange({ ...draft, hypoallergenic: value })}
          />
        </FilterSection>
        <FilterSection title="Good with children">
          <Threshold
            value={draft.goodWithChildren}
            onChange={(value) =>
              onChange({ ...draft, goodWithChildren: value })
            }
          />
        </FilterSection>
        <FilterSection title="Good with dogs">
          <Threshold
            value={draft.goodWithDogs}
            onChange={(value) => onChange({ ...draft, goodWithDogs: value })}
          />
        </FilterSection>
        <FilterSection title="Good with strangers">
          <Threshold
            value={draft.goodWithStrangers}
            onChange={(value) =>
              onChange({ ...draft, goodWithStrangers: value })
            }
          />
        </FilterSection>
      </ScrollView>
    </BottomSheetModal>
  );
}

function FilterSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View className="mb-6">
      <Text className="mb-3 text-base font-black text-doggo-ink">{title}</Text>
      {children}
    </View>
  );
}

function Chips<T extends string>({
  items,
  selected,
  onToggle,
}: {
  items: { label: string; value: T }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => {
        const active = selected.includes(item.value);
        return (
          <Pressable
            className={
              active
                ? "rounded-full bg-doggo-accent px-3 py-2"
                : "rounded-full border border-doggo-border px-3 py-2"
            }
            key={item.value}
            onPress={() => onToggle(item.value)}
          >
            <Text
              className={
                active
                  ? "font-semibold text-white"
                  : "font-semibold text-doggo-muted"
              }
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Threshold({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {THRESHOLD_OPTIONS.map((score) => (
        <Pressable
          className={
            value === score
              ? "flex-1 items-center rounded-xl bg-doggo-accent py-2"
              : "flex-1 items-center rounded-xl bg-doggo-canvas py-2"
          }
          key={score ?? "any"}
          onPress={() => onChange(score)}
        >
          <Text
            className={
              value === score
                ? "font-bold text-white"
                : "font-bold text-doggo-muted"
            }
          >
            {score ? `${score}+` : "Any"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
