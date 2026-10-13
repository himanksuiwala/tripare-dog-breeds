import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';

export function DetailsScreen() {
  const navigation = useNavigation();

  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <Text className="text-center text-2xl font-bold text-slate-900">
        Details screen
      </Text>
      <Text className="mt-3 text-center text-base text-slate-600">
        The native stack handles transitions and platform back behavior.
      </Text>
      <Pressable
        accessibilityRole="button"
        className="mt-8 rounded-xl border border-slate-300 bg-white px-6 py-3 active:bg-slate-100"
        onPress={() => navigation.goBack()}
      >
        <Text className="font-semibold text-slate-900">Go back</Text>
      </Pressable>
    </View>
  );
}
