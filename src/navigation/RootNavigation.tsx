import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ComponentProps } from "react";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { ScreenErrorFallback } from "../components/ErrorFallbacks";
import { BreedDetailsScreen } from "../screens/BreedDetailsScreen";
import { BreedGalleryScreen } from "../screens/BreedGalleryScreen";
import { BreedListScreen } from "../screens/BreedListScreen";

function BreedListRoute() {
  return (
    <ErrorBoundary FallbackComponent={ScreenErrorFallback}>
      <BreedListScreen />
    </ErrorBoundary>
  );
}

function BreedDetailsRoute(props: ComponentProps<typeof BreedDetailsScreen>) {
  return (
    <ErrorBoundary
      FallbackComponent={ScreenErrorFallback}
      resetKeys={[props.route.params.breedId]}
    >
      <BreedDetailsScreen {...props} />
    </ErrorBoundary>
  );
}

function BreedGalleryRoute(props: ComponentProps<typeof BreedGalleryScreen>) {
  return (
    <ErrorBoundary
      FallbackComponent={ScreenErrorFallback}
      resetKeys={[props.route.params.breedId, props.route.params.imageId]}
    >
      <BreedGalleryScreen {...props} />
    </ErrorBoundary>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: "Breeds",
  screens: {
    Breeds: {
      screen: BreedListRoute,
      options: { headerShown: false },
    },
    BreedDetails: {
      screen: BreedDetailsRoute,
      options: {
        title: "Breed details",
        headerBackTitle: "Breeds",
        headerStyle: { backgroundColor: "#F7F3EC" },
        headerShadowVisible: false,
        headerTintColor: "#28231F",
      },
    },
    BreedGallery: {
      screen: BreedGalleryRoute,
      options: {
        title: "Gallery",
        headerBackTitle: "Details",
        headerStyle: { backgroundColor: "#000000" },
        headerShadowVisible: false,
        headerTintColor: "#FFFFFF",
        contentStyle: { backgroundColor: "#000000" },
      },
    },
  },
});

type RootStackType = typeof RootStack;

declare module "@react-navigation/native" {
  // React Navigation uses this empty interface for declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RootNavigator extends RootStackType {}
}

export const RootNavigation = createStaticNavigation(RootStack);
