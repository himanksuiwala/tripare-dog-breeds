import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function BottomSheetModal({
  children,
  footer,
  isVisible,
  onClose,
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  isVisible: boolean;
  onClose: () => void;
  title: string;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityLabel={`Close ${title}`}
          className="absolute inset-0 bg-black/60"
          onPress={onClose}
        />
        <SafeAreaView
          className="max-h-[88%] rounded-t-3xl bg-white"
          edges={["bottom"]}
        >
          <View className="flex-row items-center justify-between px-6 pb-4 pt-5">
            <Text className="text-xl font-black text-doggo-ink">{title}</Text>
            <Pressable
              accessibilityLabel={`Close ${title}`}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full bg-doggo-canvas active:opacity-70"
              onPress={onClose}
            >
              <Text className="text-xl text-doggo-ink">×</Text>
            </Pressable>
          </View>
          {children}
          {footer ? (
            <View className="border-t border-doggo-border bg-white px-5 pb-2 pt-3">
              {footer}
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
