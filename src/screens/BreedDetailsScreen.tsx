import type { StaticScreenProps } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  BreedGalleryTab,
  BreedOverviewTab,
  BreedTraitsTab,
} from "../features/breeds/components/BreedDetailsTabs";
import { useBreedDetails } from "../features/breeds/useBreedDetails";

type Props = StaticScreenProps<{ breedId: string }>;
type DetailTab = "overview" | "traits" | "gallery";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "traits", label: "Traits" },
  { id: "gallery", label: "Gallery" },
];

export function BreedDetailsScreen({ route }: Props) {
  const navigation = useNavigation();
  const { state, retry } = useBreedDetails(route.params.breedId);
  const [selectedTab, setSelectedTab] = useState<DetailTab>("overview");
  const breedName = state.status === "success" ? state.details.name : null;

  useEffect(() => {
    navigation.setOptions({ title: breedName ?? "Breed details" });
  }, [breedName, navigation]);
  const openGalleryImage = useCallback(
    (imageId: string) =>
      navigation.navigate("BreedGallery", {
        breedId: route.params.breedId,
        imageId,
      }),
    [navigation, route.params.breedId],
  );

  if (state.status === "loading") return <DetailsSkeleton />;
  if (state.status === "not-found") {
    return (
      <FailureState
        description="This breed may no longer be available."
        onRetry={retry}
        title="Breed not found"
      />
    );
  }
  if (state.status === "error") {
    return (
      <FailureState
        description="Check your connection and try loading these details again."
        onRetry={retry}
        title="We lost the scent"
      />
    );
  }

  return (
    <View className="flex-1 bg-doggo-canvas">
      <DetailsTabBar selectedTab={selectedTab} onSelect={setSelectedTab} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-5"
        key={selectedTab}
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === "overview" ? (
          <BreedOverviewTab details={state.details} />
        ) : null}
        {selectedTab === "traits" ? (
          <BreedTraitsTab traits={state.details.traits} />
        ) : null}
        {selectedTab === "gallery" ? (
          <BreedGalleryTab
            details={state.details}
            onImagePress={openGalleryImage}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailsTabBar({
  selectedTab,
  onSelect,
}: {
  selectedTab: DetailTab;
  onSelect: (tab: DetailTab) => void;
}) {
  return (
    <View className="border-b border-doggo-border bg-doggo-canvas px-5 pb-3 pt-3">
      <View className="flex-row rounded-2xl bg-doggo-skeleton p-1">
        {DETAIL_TABS.map((tab) => {
          const isSelected = selectedTab === tab.id;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              className={
                isSelected
                  ? "flex-1 items-center rounded-xl bg-white py-2.5"
                  : "flex-1 items-center rounded-xl py-2.5"
              }
              key={tab.id}
              onPress={() => onSelect(tab.id)}
            >
              <Text
                className={
                  isSelected
                    ? "text-sm font-bold text-doggo-ink"
                    : "text-sm font-bold text-doggo-muted"
                }
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DetailsSkeleton() {
  return (
    <View
      accessibilityLabel="Loading breed details"
      className="flex-1 bg-doggo-canvas px-5 pt-5"
    >
      <View className="h-11 rounded-2xl bg-doggo-skeleton" />
      <View className="mt-5 h-64 rounded-3xl bg-doggo-skeleton" />
      <View className="mt-7 h-6 w-1/3 rounded-full bg-doggo-skeleton" />
      <View className="mt-4 h-4 rounded-full bg-doggo-skeleton" />
      <View className="mt-3 h-4 rounded-full bg-doggo-skeleton" />
      <View className="mt-3 h-4 w-2/3 rounded-full bg-doggo-skeleton" />
    </View>
  );
}

function FailureState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-doggo-canvas px-8 pb-16">
      <Text className="text-center text-2xl font-black text-doggo-ink">
        {title}
      </Text>
      <Text className="mt-3 text-center text-base leading-6 text-doggo-muted">
        {description}
      </Text>
      <Pressable
        accessibilityRole="button"
        className="mt-6 rounded-full bg-doggo-accent px-6 py-3 active:opacity-80"
        onPress={onRetry}
      >
        <Text className="font-bold text-white">Try again</Text>
      </Pressable>
    </View>
  );
}
