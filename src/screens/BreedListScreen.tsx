import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Breed } from '../api/breeds';
import { useBreedPagination } from '../features/breeds/useBreedPagination';

function BreedAvatar({ breed }: { breed: Breed }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  if (!breed.thumbnailUrl || failedImageUrl === breed.thumbnailUrl) {
    return (
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-doggo-accent-soft">
        <Text className="text-xl font-bold text-doggo-accent">
          {breed.name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`${breed.name} breed`}
      className="h-16 w-16 rounded-2xl bg-doggo-accent-soft"
      onError={() => setFailedImageUrl(breed.thumbnailUrl)}
      resizeMode="cover"
      source={{ uri: breed.thumbnailUrl }}
    />
  );
}

function BreedRow({ breed }: { breed: Breed }) {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityLabel={`View details for ${breed.name}`}
      accessibilityRole="button"
      className="mb-3 flex-row items-center rounded-3xl border border-doggo-border bg-white p-3 active:opacity-70"
      onPress={() => navigation.navigate('BreedDetails', { breedId: breed.id })}
    >
      <BreedAvatar breed={breed} />
      <View className="ml-4 min-w-0 flex-1">
        <Text className="text-lg font-bold text-doggo-ink" numberOfLines={1}>
          {breed.name}
        </Text>
        <Text className="mt-1 text-sm text-doggo-muted">
          {breed.lifeMin}–{breed.lifeMax} years
        </Text>
      </View>
      {breed.hypoallergenic ? (
        <View className="ml-2 rounded-full bg-doggo-success-soft px-2.5 py-1">
          <Text className="text-xs font-semibold text-doggo-success">Hypoallergenic</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SkeletonList() {
  return (
    <View className="px-5 pt-4" accessibilityLabel="Loading breeds">
      {Array.from({ length: 7 }, (_, index) => (
        <View
          className="mb-3 flex-row items-center rounded-3xl border border-doggo-border bg-white p-3"
          key={index}
        >
          <View className="h-16 w-16 rounded-2xl bg-doggo-skeleton" />
          <View className="ml-4 flex-1">
            <View className="h-5 w-2/3 rounded-full bg-doggo-skeleton" />
            <View className="mt-3 h-4 w-1/3 rounded-full bg-doggo-skeleton" />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-10 py-20">
      <Text className="text-center text-xl font-bold text-doggo-ink">No breeds found</Text>
      <Text className="mt-2 text-center text-base leading-6 text-doggo-muted">
        The breed catalogue is empty right now. Pull down to try again.
      </Text>
    </View>
  );
}

export function BreedListScreen() {
  const { state, refresh, loadMore, retryInitial } = useBreedPagination();

  if (state.isInitialLoading) {
    return (
      <SafeAreaView className="flex-1 bg-doggo-canvas" edges={['top']}>
        <View className="px-5">
          <Header totalRecords={null} />
        </View>
        <SkeletonList />
      </SafeAreaView>
    );
  }

  if (state.initialError) {
    return (
      <SafeAreaView className="flex-1 bg-doggo-canvas" edges={['top']}>
        <View className="px-5">
          <Header totalRecords={null} />
        </View>
        <View className="flex-1 items-center justify-center px-8 pb-16">
          <Text className="text-center text-2xl font-bold text-doggo-ink">
            We lost the scent
          </Text>
          <Text className="mt-3 text-center text-base leading-6 text-doggo-muted">
            We couldn’t load the breed catalogue. Check your connection and try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-6 rounded-full bg-doggo-accent px-6 py-3 active:opacity-80"
            onPress={retryInitial}
          >
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-doggo-canvas" edges={['top']}>
      <View className="px-5">
        <Header totalRecords={state.totalRecords} />
      </View>
      <FlatList
        contentContainerClassName="px-5 pb-8"
        data={state.breeds}
        keyExtractor={(breed) => breed.id}
        ListEmptyComponent={EmptyState}
        ListFooterComponent={
          <ListFooter
            error={state.paginationError}
            isLoading={state.isLoadingMore}
            onRetry={loadMore}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={state.isRefreshing}
            tintColor="#B65E3C"
          />
        }
        renderItem={({ item }) => <BreedRow breed={item} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function Header({ totalRecords }: { totalRecords: number | null }) {
  return (
    <View className="pb-5 pt-6">
      <Text className="text-sm font-semibold uppercase tracking-widest text-doggo-accent">
        Doggo
      </Text>
      <Text className="mt-1 text-4xl font-black tracking-tight text-doggo-ink">
        Find your breed
      </Text>
      <Text className="mt-2 text-base text-doggo-muted">
        {totalRecords === null ? 'Explore every kind of dog' : `${totalRecords} breeds to explore`}
      </Text>

      <View className="mt-5 flex-row">
        <View className="mr-3 flex-1 flex-row items-center rounded-2xl border border-doggo-border bg-white px-4">
          <Text className="mr-2 text-lg text-doggo-muted">⌕</Text>
          <TextInput
            accessibilityHint="Search is not available yet"
            accessibilityLabel="Search breeds"
            className="h-12 flex-1 text-base text-doggo-ink"
            editable={false}
            placeholder="Search breeds"
            placeholderTextColor="#8A8078"
          />
        </View>
        <Pressable
          accessibilityHint="Filters are not available yet"
          accessibilityRole="button"
          className="h-12 justify-center rounded-2xl border border-doggo-border bg-white px-4"
          disabled
        >
          <Text className="font-semibold text-doggo-ink">Filter</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ListFooter({
  error,
  isLoading,
  onRetry,
}: {
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <View className="items-center py-5">
        <ActivityIndicator color="#B65E3C" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center px-6 py-5">
        <Text className="text-center text-sm text-doggo-muted">Couldn’t load more breeds.</Text>
        <Pressable
          accessibilityRole="button"
          className="mt-2 rounded-full px-4 py-2 active:bg-doggo-accent-soft"
          onPress={onRetry}
        >
          <Text className="font-bold text-doggo-accent">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}
