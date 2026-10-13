import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DetailsScreen } from '../screens/DetailsScreen';
import { HomeScreen } from '../screens/HomeScreen';

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: {
      screen: HomeScreen,
      options: { title: 'Doggo' },
    },
    Details: {
      screen: DetailsScreen,
      options: { title: 'Details' },
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
