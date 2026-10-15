import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Breed } from "../api/breeds";
import {
  countActiveFilters,
  emptyBreedFilters,
  filterBreeds,
  type BreedFilters,
} from "../features/breeds/breedFilters";
import { BreedFilterSheet } from "../features/breeds/components/BreedFilterSheet";
import { BreedListHeader } from "../features/breeds/components/BreedListHeader";
import { BreedRow } from "../features/breeds/components/BreedRow";
import { formatLastSynced } from "../features/breeds/catalogueFreshness";
import { buildBreedSections } from "../features/breeds/breedSections";
import type { BreedSection } from "../features/breeds/breedSections";
import { useBreedCatalogue } from "../features/breeds/useBreedCatalogue";

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
      <BreedListHeader
        activeFilterCount={activeCount}
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
        onSearchChange={setSearch}
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
      <BreedFilterSheet
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
