import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BreedDetailsScreen } from '../screens/BreedDetailsScreen';
import { BreedListScreen } from '../screens/BreedListScreen';

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Breeds',
  screens: {
    Breeds: {
      screen: BreedListScreen,
      options: { headerShown: false },
    },
    BreedDetails: {
      screen: BreedDetailsScreen,
      options: {
        title: 'Breed details',
        headerBackTitle: 'Breeds',
        headerStyle: { backgroundColor: '#F7F3EC' },
        headerShadowVisible: false,
        headerTintColor: '#28231F',
      },
    },
  },
});

type RootStackType = typeof RootStack;

declare module '@react-navigation/native' {
  // React Navigation uses this empty interface for declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RootNavigator extends RootStackType {}
}

export const RootNavigation = createStaticNavigation(RootStack);
