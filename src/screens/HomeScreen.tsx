import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';

export function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-center text-3xl font-bold text-slate-900">
        Welcome to Doggo
      </Text>
      <Text className="mt-3 text-center text-base text-slate-600">
        React Navigation and NativeWind are ready.
      </Text>
      <Pressable
        accessibilityRole="button"
        className="mt-8 rounded-xl bg-slate-900 px-6 py-3 active:bg-slate-700"
        onPress={() => navigation.navigate('Details')}
      >
        <Text className="font-semibold text-white">Open details</Text>
      </Pressable>
    </View>
  );
}
