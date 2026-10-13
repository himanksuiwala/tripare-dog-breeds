import type { StaticScreenProps } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BreedImage } from '../api/breedDetails';
import { BottomSheetModal } from '../components/BottomSheetModal';
import { resolveInitialImageIndex } from '../features/breeds/gallery';
import { useBreedDetails } from '../features/breeds/useBreedDetails';

type Props = StaticScreenProps<{ breedId: string; imageId: string }>;

export function BreedGalleryScreen({ route }: Props) {
  const navigation = useNavigation();
  const { state, retry } = useBreedDetails(route.params.breedId);
  const breedName = state.status === 'success' ? state.details.name : null;

  useEffect(() => {
    navigation.setOptions({ title: breedName ?? 'Gallery' });
  }, [breedName, navigation]);

  if (state.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="white" size="large" />
        <Text className="mt-4 text-base text-white/70">Loading gallery…</Text>
      </View>
    );
  }

  if (state.status !== 'success') {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8 pb-16">
        <Text className="text-center text-2xl font-black text-white">
          {state.status === 'not-found' ? 'Breed not found' : 'Couldn’t load gallery'}
        </Text>
        <Text className="mt-3 text-center text-base leading-6 text-white/70">
          Check your connection and try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          className="mt-6 rounded-full bg-white px-6 py-3 active:opacity-80"
          onPress={retry}
        >
          <Text className="font-bold text-black">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (state.details.images.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8 pb-16">
        <Text className="text-center text-2xl font-black text-white">No photos available</Text>
      </View>
    );
  }

  return (
    <GalleryViewer
      breedName={state.details.name}
      images={state.details.images}
      selectedImageId={route.params.imageId}
    />
  );
}

function GalleryViewer({
  breedName,
  images,
  selectedImageId,
}: {
  breedName: string;
  images: BreedImage[];
  selectedImageId: string;
}) {
  const { width } = useWindowDimensions();
  const initialIndex = resolveInitialImageIndex(images, selectedImageId);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isAttributionOpen, setIsAttributionOpen] = useState(false);
  const currentImage = images[currentIndex] ?? images[0];

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.max(
      0,
      Math.min(Math.round(event.nativeEvent.contentOffset.x / width), images.length - 1),
    );
    setCurrentIndex(nextIndex);
    AccessibilityInfo.announceForAccessibility(
      `${breedName} image ${nextIndex + 1} of ${images.length}`,
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['bottom']}>
      <FlatList
        data={images}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        horizontal
        initialScrollIndex={initialIndex}
        keyExtractor={(image) => image.id}
        onMomentumScrollEnd={handleScrollEnd}
        pagingEnabled
        renderItem={({ item, index }) => (
          <GalleryPage
            breedName={breedName}
            image={item}
            imageNumber={index + 1}
            pageWidth={width}
            totalImages={images.length}
          />
        )}
        showsHorizontalScrollIndicator={false}
      />
      <Pressable
        accessibilityLabel="Show image information"
        accessibilityRole="button"
        className="absolute bottom-7 right-5 h-12 w-12 items-center justify-center rounded-full bg-white/90 active:opacity-70"
        onPress={() => setIsAttributionOpen(true)}
      >
        <Text className="text-xl font-black text-black">i</Text>
      </Pressable>
      <AttributionSheet
        image={currentImage}
        isVisible={isAttributionOpen}
        onClose={() => setIsAttributionOpen(false)}
      />
    </SafeAreaView>
  );
}

function GalleryPage({
  breedName,
  image,
  imageNumber,
  totalImages,
  pageWidth,
}: {
  breedName: string;
  image: BreedImage;
  imageNumber: number;
  totalImages: number;
  pageWidth: number;
}) {
  const [imageSource, setImageSource] = useState<'large' | 'medium' | 'failed'>('large');
  const imageUrl = imageSource === 'large' ? image.largeUrl : image.mediumUrl;

  const handleImageError = () => {
    setImageSource((source) => (source === 'large' ? 'medium' : 'failed'));
  };

  return (
    <View
      accessibilityLabel={`${breedName} image ${imageNumber} of ${totalImages}`}
      className="flex-1"
      style={{ width: pageWidth }}
    >
      <View className="flex-1 items-center justify-center">
        {imageSource === 'failed' ? (
          <View className="h-40 w-40 items-center justify-center rounded-full bg-white/10">
            <Text className="text-7xl font-black text-white/70">
              {breedName.charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : (
          <Image
            accessibilityIgnoresInvertColors
            className="h-full w-full"
            onError={handleImageError}
            resizeMode="contain"
            source={{ uri: imageUrl }}
          />
        )}
      </View>
      <View className="items-center px-20 pb-7 pt-3">
        {image.attribution?.author ? (
          <Text className="text-center text-sm text-white/70" numberOfLines={1}>
            Photo: {image.attribution.author}
          </Text>
        ) : null}
        <Text className="mt-1 text-sm font-bold text-white">
          Image {imageNumber} of {totalImages}
        </Text>
      </View>
    </View>
  );
}

function AttributionSheet({
  image,
  isVisible,
  onClose,
}: {
  image: BreedImage;
  isVisible: boolean;
  onClose: () => void;
}) {
  const attributionRows = image.attribution
    ? [
        { label: 'Author', value: image.attribution.author },
        { label: 'License', value: image.attribution.license },
        { label: 'Source', value: image.attribution.source },
      ].filter((row): row is { label: string; value: string } => Boolean(row.value))
    : [];

  return (
    <BottomSheetModal isVisible={isVisible} onClose={onClose} title="Image information">
      <View className="px-6 pb-4">
          {attributionRows.length > 0 ? (
            <View className="rounded-2xl bg-doggo-canvas px-4">
              {attributionRows.map((row, index) => (
                <View key={row.label}>
                  {index > 0 ? <View className="h-px bg-doggo-border" /> : null}
                  <AttributionRow label={row.label} value={row.value} />
                </View>
              ))}
            </View>
          ) : (
            <Text className="pb-4 text-base text-doggo-muted">
              No attribution information is available for this image.
            </Text>
          )}
      </View>
    </BottomSheetModal>
  );
}

function AttributionRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-4">
      <Text className="text-xs font-bold uppercase tracking-wider text-doggo-muted">{label}</Text>
      <Text className="mt-1 text-base font-semibold text-doggo-ink">{value}</Text>
    </View>
  );
}
