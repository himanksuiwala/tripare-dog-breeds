import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Breed, BreedGroup } from "../api/breeds";
import { BottomSheetModal } from "../components/BottomSheetModal";
import {
  countActiveFilters,
  emptyBreedFilters,
  filterBreeds,
  type BreedFilters,
  type CoatCategory,
  type HypoallergenicFilter,
  type SizeBand,
} from "../features/breeds/breedFilters";
import { formatLastSynced } from "../features/breeds/catalogueFreshness";
import { buildBreedSections } from "../features/breeds/breedSections";
import type { BreedSection } from "../features/breeds/breedSections";
import { useBreedCatalogue } from "../features/breeds/useBreedCatalogue";

const thumbnailStyle = { width: 64, height: 64, borderRadius: 16 } as const;

type BreedRowProps = Pick<
  Breed,
  "id" | "name" | "lifeMin" | "lifeMax" | "hypoallergenic" | "thumbnailUrl"
> & {
  onPress: (breedId: string) => void;
};

const BreedRow = memo(function BreedRow({
  id,
  name,
  lifeMin,
  lifeMax,
  hypoallergenic,
  thumbnailUrl,
  onPress,
}: BreedRowProps) {
  const [failed, setFailed] = useState(false);
  return (
    <Pressable
      accessibilityLabel={`View details for ${name}`}
      accessibilityRole="button"
      className="mb-3 flex-row items-center rounded-3xl border border-doggo-border bg-white p-3 active:opacity-70"
      onPress={() => onPress(id)}
    >
      {thumbnailUrl && !failed ? (
        <Image
          cachePolicy="disk"
          contentFit="cover"
          enforceEarlyResizing
          onError={() => setFailed(true)}
          recyclingKey={id}
          source={thumbnailUrl}
          style={thumbnailStyle}
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-doggo-accent-soft">
          <Text className="text-xl font-bold text-doggo-accent">
            {name.charAt(0)}
          </Text>
        </View>
      )}
      <View className="ml-4 min-w-0 flex-1">
        <Text className="text-lg font-bold text-doggo-ink" numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-1 text-sm text-doggo-muted">
          {lifeMin}–{lifeMax} years
        </Text>
      </View>
      {hypoallergenic ? (
        <View className="ml-2 rounded-full bg-doggo-success-soft px-2.5 py-1">
          <Text className="text-xs font-semibold text-doggo-success">
            Hypoallergenic
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

function breedKeyExtractor(breed: Breed): string {
  return breed.id;
}

function renderBreedSectionHeader({ section }: { section: BreedSection }) {
  return (
    <View className="bg-doggo-canvas pb-3 pt-4">
      <Text className="text-sm font-black uppercase tracking-widest text-doggo-accent">
        {section.title} · {section.data.length}
      </Text>
    </View>
  );
}

export function BreedListScreen() {
  const navigation = useNavigation();
  const { state, retry, refresh, retryBackground } = useBreedCatalogue();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<BreedFilters>(emptyBreedFilters);
  const [draft, setDraft] = useState<BreedFilters>(emptyBreedFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [freshnessClock, setFreshnessClock] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const initialTimer = setTimeout(() => setFreshnessClock(Date.now()), 0);
    const timer = setInterval(() => setFreshnessClock(Date.now()), 60_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, []);
  const results = useMemo(
    () => filterBreeds(state.breeds, debouncedSearch, filters),
    [debouncedSearch, filters, state.breeds],
  );
  const sections = useMemo(
    () => buildBreedSections(results, state.groups),
    [results, state.groups],
  );
  const activeCount = countActiveFilters(filters);
  const controlsDisabled =
    state.breeds.length === 0 &&
    state.isCompletingCatalogue &&
    !state.isCatalogueIncomplete;
  const openBreed = useCallback(
    (breedId: string) => navigation.navigate("BreedDetails", { breedId }),
    [navigation],
  );
  const renderBreed = useCallback(
    ({ item }: { item: Breed }) => (
      <BreedRow
        id={item.id}
        hypoallergenic={item.hypoallergenic}
        lifeMax={item.lifeMax}
        lifeMin={item.lifeMin}
        name={item.name}
        onPress={openBreed}
        thumbnailUrl={item.thumbnailUrl}
      />
    ),
    [openBreed],
  );
  const openFilters = useCallback(() => {
    setDraft({
      ...filters,
      groupIds: [...filters.groupIds],
      sizes: [...filters.sizes],
      coats: [...filters.coats],
    });
    setSheetOpen(true);
  }, [filters]);
  const clearFilters = useCallback(() => setFilters(emptyBreedFilters), []);
  const clearSearch = useCallback(() => setSearch(""), []);

  if (state.isLoading)
    return (
      <SafeAreaView
        className="flex-1 bg-doggo-canvas px-5 pt-6"
        edges={["top"]}
      >
        <Text className="text-4xl font-black text-doggo-ink">
          Find your breed
        </Text>
        <Text className="mt-2 text-doggo-muted">
          {state.totalPages
            ? `Loading breeds… ${state.loadedPages} of ${state.totalPages}`
            : "Loading breeds…"}
        </Text>
        <SkeletonList />
      </SafeAreaView>
    );
  if (state.hasError)
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-doggo-canvas px-8"
        edges={["top"]}
      >
        <Text className="text-2xl font-black text-doggo-ink">
          We lost the scent
        </Text>
        <Text className="mt-3 text-center text-doggo-muted">
          The complete catalogue could not be loaded.
        </Text>
        <Pressable
          className="mt-6 rounded-full bg-doggo-accent px-6 py-3"
          onPress={retry}
        >
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-doggo-canvas" edges={["top"]}>
      <Header
        activeCount={activeCount}
        controlsDisabled={controlsDisabled}
        isCatalogueIncomplete={state.isCatalogueIncomplete}
        isCompletingCatalogue={state.isCompletingCatalogue}
        isOffline={state.isOffline}
        isRefreshing={state.isRefreshing}
        lastSyncedLabel={formatLastSynced(
          state.lastSuccessfulSyncAt,
          freshnessClock,
        )}
        onFilter={openFilters}
        search={search}
        setSearch={setSearch}
      />
      <SectionList
        contentContainerClassName="flex-grow px-5 pb-8"
        initialNumToRender={8}
        keyboardDismissMode="on-drag"
        keyExtractor={breedKeyExtractor}
        ListEmptyComponent={
          <EmptyResults
            hasFilters={activeCount > 0}
            hasSearch={debouncedSearch.length > 0}
            onClearFilters={clearFilters}
            onClearSearch={clearSearch}
          />
        }
        maxToRenderPerBatch={6}
        ListHeaderComponent={
          state.errorMessage ? (
            <CatalogueNotice
              isLoading={state.isCompletingCatalogue || state.isRefreshing}
              message={
                state.isCatalogueIncomplete
                  ? "Some breeds could not be loaded. Search and filters use the available catalogue."
                  : state.isOffline
                    ? `You’re offline. ${formatLastSynced(state.lastSuccessfulSyncAt, freshnessClock) ?? "Showing saved data."}`
                    : "The catalogue could not be refreshed. Your previous results are still available."
              }
              onRetry={state.isCatalogueIncomplete ? retryBackground : refresh}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={state.isPullRefreshing}
            tintColor="#B65E3C"
          />
        }
        renderItem={renderBreed}
        renderSectionHeader={renderBreedSectionHeader}
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled
        updateCellsBatchingPeriod={50}
        windowSize={7}
      />
      <FilterSheet
        breeds={state.breeds}
        draft={draft}
        groups={state.groups}
        groupsUnavailable={state.groupsUnavailable}
        isVisible={sheetOpen}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
        onChange={setDraft}
        onClose={() => setSheetOpen(false)}
        query={debouncedSearch}
      />
    </SafeAreaView>
  );
}

function Header({
  activeCount,
  controlsDisabled,
  isCatalogueIncomplete,
  isCompletingCatalogue,
  isOffline,
  isRefreshing,
  lastSyncedLabel,
  onFilter,
  search,
  setSearch,
}: {
  activeCount: number;
  controlsDisabled: boolean;
  isCatalogueIncomplete: boolean;
  isCompletingCatalogue: boolean;
  isOffline: boolean;
  isRefreshing: boolean;
  lastSyncedLabel: string | null;
  onFilter: () => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  const statusLabel = isCatalogueIncomplete
    ? isCompletingCatalogue
      ? "Loading the remaining catalogue…"
      : "Catalogue incomplete"
    : isRefreshing
      ? "Updating… Showing saved data"
      : isOffline
        ? `Offline${lastSyncedLabel ? ` · ${lastSyncedLabel}` : ""}`
        : lastSyncedLabel;

  return (
    <View className="px-5 pb-3 pt-3">
      <Text className="text-xs font-bold uppercase tracking-widest text-doggo-accent">
        Doggo
      </Text>
      <Text className="mt-0.5 text-3xl font-black tracking-tight text-doggo-ink">
        Find your breed
      </Text>
      {statusLabel ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-1 text-xs font-medium text-doggo-muted"
          numberOfLines={1}
        >
          {statusLabel}
        </Text>
      ) : null}
      <View className="mt-3 flex-row items-center">
        <View className="mr-2 h-12 flex-1 flex-row items-center rounded-2xl border border-doggo-border bg-white pl-4 pr-1">
          <TextInput
            accessibilityLabel="Search breeds"
            accessibilityState={{ disabled: controlsDisabled }}
            className="h-full flex-1 py-0 text-base leading-5 text-doggo-ink"
            onChangeText={setSearch}
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Search breeds"
            placeholderTextColor="#8A8078"
            returnKeyType="search"
            textAlignVertical="center"
            value={search}
            editable={!controlsDisabled}
          />
          {search ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full active:bg-doggo-canvas"
              hitSlop={4}
              onPress={() => setSearch("")}
            >
              <Text className="text-3xl font-light leading-none text-doggo-muted">
                ×
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: controlsDisabled }}
          className={
            controlsDisabled
              ? "h-12 flex-row items-center justify-center rounded-2xl border border-doggo-border bg-white px-4 opacity-50"
              : "h-12 flex-row items-center justify-center rounded-2xl border border-doggo-border bg-white px-4 active:opacity-70"
          }
          disabled={controlsDisabled}
          onPress={onFilter}
        >
          <Text className="text-base font-bold text-doggo-ink">Filter</Text>
          {activeCount ? (
            <View className="ml-2 min-w-5 items-center rounded-full bg-doggo-accent px-1.5 py-0.5">
              <Text className="text-xs font-bold text-white">
                {activeCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

function CatalogueNotice({
  isLoading,
  message,
  onRetry,
}: {
  isLoading: boolean;
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="mt-4 flex-row items-center rounded-2xl bg-doggo-accent-soft px-4 py-3">
      <Text className="mr-3 flex-1 text-sm text-doggo-ink">{message}</Text>
      <Pressable
        accessibilityRole="button"
        className="rounded-full bg-white px-4 py-2 active:opacity-70"
        disabled={isLoading}
        onPress={onRetry}
      >
        <Text className="font-bold text-doggo-accent">
          {isLoading ? "Retrying…" : "Retry"}
        </Text>
      </Pressable>
    </View>
  );
}

function FilterSheet({
  breeds,
  draft,
  groups,
  groupsUnavailable,
  isVisible,
  onApply,
  onChange,
  onClose,
  query,
}: {
  breeds: Breed[];
  draft: BreedFilters;
  groups: BreedGroup[];
  groupsUnavailable: boolean;
  isVisible: boolean;
  onApply: (value: BreedFilters) => void;
  onChange: (value: BreedFilters) => void;
  onClose: () => void;
  query: string;
}) {
  const count = useMemo(
    () => filterBreeds(breeds, query, draft).length,
    [breeds, draft, query],
  );
  const toggle = <T extends string>(values: T[], value: T) =>
    values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
  const sizes: { label: string; value: SizeBand }[] = [
    "small",
    "medium",
    "large",
    "giant",
  ].map((value) => ({
    value: value as SizeBand,
    label: value[0].toUpperCase() + value.slice(1),
  }));
  const coats: { label: string; value: CoatCategory }[] = [
    "short",
    "medium",
    "long",
    "wire",
    "hairless",
  ].map((value) => ({
    value: value as CoatCategory,
    label: value[0].toUpperCase() + value.slice(1),
  }));
  const hypo: { label: string; value: HypoallergenicFilter }[] = [
    { label: "Any", value: "any" },
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ];
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
              Show {count} breeds
            </Text>
          </Pressable>
        </View>
      }
      isVisible={isVisible}
      onClose={onClose}
      title="Filter breeds"
    >
      <ScrollView contentContainerClassName="px-6 pb-6">
        <Section title="Breed group">
          {groupsUnavailable ? (
            <Text className="text-doggo-muted">Groups unavailable</Text>
          ) : (
            <Chips
              items={groups.map((group) => ({
                label: group.name.replace(/ Group$| Class$/, ""),
                value: group.id,
              }))}
              selected={draft.groupIds}
              toggle={(value) =>
                onChange({ ...draft, groupIds: toggle(draft.groupIds, value) })
              }
            />
          )}
        </Section>
        <Section title="Size">
          <Chips
            items={sizes}
            selected={draft.sizes}
            toggle={(value) =>
              onChange({ ...draft, sizes: toggle(draft.sizes, value) })
            }
          />
        </Section>
        <Section title="Coat">
          <Chips
            items={coats}
            selected={draft.coats}
            toggle={(value) =>
              onChange({ ...draft, coats: toggle(draft.coats, value) })
            }
          />
        </Section>
        <Section title="Hypoallergenic">
          <Chips
            items={hypo}
            selected={[draft.hypoallergenic]}
            toggle={(value) => onChange({ ...draft, hypoallergenic: value })}
          />
        </Section>
        <Section title="Good with children">
          <Threshold
            value={draft.goodWithChildren}
            set={(value) => onChange({ ...draft, goodWithChildren: value })}
          />
        </Section>
        <Section title="Good with dogs">
          <Threshold
            value={draft.goodWithDogs}
            set={(value) => onChange({ ...draft, goodWithDogs: value })}
          />
        </Section>
        <Section title="Good with strangers">
          <Threshold
            value={draft.goodWithStrangers}
            set={(value) => onChange({ ...draft, goodWithStrangers: value })}
          />
        </Section>
      </ScrollView>
    </BottomSheetModal>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
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
  toggle,
}: {
  items: { label: string; value: T }[];
  selected: T[];
  toggle: (value: T) => void;
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
            onPress={() => toggle(item.value)}
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
  set,
}: {
  value: number | null;
  set: (value: number | null) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {[null, 1, 2, 3, 4, 5].map((score) => (
        <Pressable
          className={
            value === score
              ? "flex-1 items-center rounded-xl bg-doggo-accent py-2"
              : "flex-1 items-center rounded-xl bg-doggo-canvas py-2"
          }
          key={score ?? "any"}
          onPress={() => set(score)}
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
function EmptyResults({
  hasFilters,
  hasSearch,
  onClearFilters,
  onClearSearch,
}: {
  hasFilters: boolean;
  hasSearch: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-xl font-black text-doggo-ink">
        No matching breeds
      </Text>
      <View className="mt-5 flex-row gap-4">
        {hasSearch ? (
          <Pressable onPress={onClearSearch}>
            <Text className="font-bold text-doggo-accent">Clear search</Text>
          </Pressable>
        ) : null}
        {hasFilters ? (
          <Pressable onPress={onClearFilters}>
            <Text className="font-bold text-doggo-accent">Clear filters</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
function SkeletonList() {
  return (
    <View className="pt-6">
      {Array.from({ length: 6 }, (_, i) => (
        <View className="mb-3 h-24 rounded-3xl bg-doggo-skeleton" key={i} />
      ))}
    </View>
  );
}
