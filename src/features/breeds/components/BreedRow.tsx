import { Image } from "expo-image";
import { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { Breed } from "../../../api/breeds";

const thumbnailStyle = { width: 64, height: 64, borderRadius: 16 } as const;

type BreedRowProps = Pick<
  Breed,
  "id" | "name" | "lifeMin" | "lifeMax" | "hypoallergenic" | "thumbnailUrl"
> & {
  onPress: (breedId: string) => void;
};

export const BreedRow = memo(function BreedRow({
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
