import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";

import type { ErrorFallbackProps } from "./ErrorBoundary";

export function AppErrorFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-doggo-canvas px-8">
      <Text className="text-center text-2xl font-black text-doggo-ink">
        Doggo couldn’t start
      </Text>
      <Text className="mt-3 text-center text-base leading-6 text-doggo-muted">
        Close and reopen the app to try again.
      </Text>
    </View>
  );
}

export function ScreenErrorFallback({ onRetry }: ErrorFallbackProps) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  return (
    <View className="flex-1 items-center justify-center bg-doggo-canvas px-8 pb-16">
      <Text className="text-center text-2xl font-black text-doggo-ink">
        Something went wrong
      </Text>
      <Text className="mt-3 text-center text-base leading-6 text-doggo-muted">
        This screen couldn’t be displayed.
      </Text>
      <View className="mt-6 flex-row gap-3">
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            className="rounded-full border border-doggo-border bg-white px-6 py-3 active:opacity-70"
            onPress={() => navigation.goBack()}
          >
            <Text className="font-bold text-doggo-ink">Go back</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          className="rounded-full bg-doggo-accent px-6 py-3 active:opacity-80"
          onPress={onRetry}
        >
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}
