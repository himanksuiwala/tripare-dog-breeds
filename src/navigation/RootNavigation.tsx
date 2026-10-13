import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BreedDetailsScreen } from "../screens/BreedDetailsScreen";
import { BreedGalleryScreen } from "../screens/BreedGalleryScreen";
import { BreedListScreen } from "../screens/BreedListScreen";

const RootStack = createNativeStackNavigator({
  initialRouteName: "Breeds",
  screens: {
    Breeds: {
      screen: BreedListScreen,
      options: { headerShown: false },
    },
    BreedDetails: {
      screen: BreedDetailsScreen,
      options: {
        title: "Breed details",
        headerBackTitle: "Breeds",
        headerStyle: { backgroundColor: "#F7F3EC" },
        headerShadowVisible: false,
        headerTintColor: "#28231F",
      },
    },
    BreedGallery: {
      screen: BreedGalleryScreen,
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
