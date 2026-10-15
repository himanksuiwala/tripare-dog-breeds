import { Keyboard, Pressable, Text, TextInput, View } from "react-native";

type BreedListHeaderProps = {
  activeFilterCount: number;
  controlsDisabled: boolean;
  isCatalogueIncomplete: boolean;
  isCompletingCatalogue: boolean;
  isOffline: boolean;
  isRefreshing: boolean;
  lastSyncedLabel: string | null;
  onFilter: () => void;
  onSearchChange: (value: string) => void;
  search: string;
};

function getStatusLabel({
  isCatalogueIncomplete,
  isCompletingCatalogue,
  isOffline,
  isRefreshing,
  lastSyncedLabel,
}: Pick<
  BreedListHeaderProps,
  | "isCatalogueIncomplete"
  | "isCompletingCatalogue"
  | "isOffline"
  | "isRefreshing"
  | "lastSyncedLabel"
>): string | null {
  if (isCatalogueIncomplete) {
    return isCompletingCatalogue
      ? "Loading the remaining catalogue…"
      : "Catalogue incomplete";
  }
  if (isRefreshing) return "Updating… Showing saved data";
  if (isOffline) {
    return `Offline${lastSyncedLabel ? ` · ${lastSyncedLabel}` : ""}`;
  }
  return lastSyncedLabel;
}

export function BreedListHeader(props: BreedListHeaderProps) {
  const statusLabel = getStatusLabel(props);

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
            accessibilityState={{ disabled: props.controlsDisabled }}
            className="h-full flex-1 py-0 text-base leading-5 text-doggo-ink"
            editable={!props.controlsDisabled}
            onChangeText={props.onSearchChange}
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Search breeds"
            placeholderTextColor="#8A8078"
            returnKeyType="search"
            textAlignVertical="center"
            value={props.search}
          />
          {props.search ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full active:bg-doggo-canvas"
              hitSlop={4}
              onPress={() => props.onSearchChange("")}
            >
              <Text className="text-3xl font-light leading-none text-doggo-muted">
                ×
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: props.controlsDisabled }}
          className={
            props.controlsDisabled
              ? "h-12 flex-row items-center justify-center rounded-2xl border border-doggo-border bg-white px-4 opacity-50"
              : "h-12 flex-row items-center justify-center rounded-2xl border border-doggo-border bg-white px-4 active:opacity-70"
          }
          disabled={props.controlsDisabled}
          onPress={props.onFilter}
        >
          <Text className="text-base font-bold text-doggo-ink">Filter</Text>
          {props.activeFilterCount ? (
            <View className="ml-2 min-w-5 items-center rounded-full bg-doggo-accent px-1.5 py-0.5">
              <Text className="text-xs font-bold text-white">
                {props.activeFilterCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
