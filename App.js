import './global.css';

import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-center text-xl font-bold text-slate-900">
        NativeWind is ready.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}
