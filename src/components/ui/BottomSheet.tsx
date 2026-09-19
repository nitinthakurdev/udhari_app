import { colors, spacing } from "@/constants/theme";
import {
  BottomSheet as NativeBottomSheet,
  BottomSheetScrollView,
} from "@expo/ui/community/bottom-sheet";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BottomSheetProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  dismissOnBackdrop?: boolean;
  initialSnapIndex?: 0 | 1;
  onClose: () => void;
  scrollable?: boolean;
  sheetStyle?: StyleProp<ViewStyle>;
  showHandle?: boolean;
  testID?: string;
  visible: boolean;
};

const SNAP_POINTS = ["55%", "92%"];

export function BottomSheet({
  children,
  contentContainerStyle,
  dismissOnBackdrop = true,
  initialSnapIndex = 1,
  onClose,
  scrollable = true,
  sheetStyle,
  showHandle = true,
  testID,
  visible,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.content,
    { paddingBottom: Math.max(insets.bottom, spacing.lg) },
    contentContainerStyle,
  ];

  return (
    <NativeBottomSheet
      backgroundStyle={[styles.sheet, sheetStyle]}
      enableDynamicSizing={false}
      enablePanDownToClose={dismissOnBackdrop}
      handleComponent={showHandle ? undefined : null}
      index={visible ? initialSnapIndex : -1}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onClose={onClose}
      snapPoints={SNAP_POINTS}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoider}
      >
        {scrollable ? (
          <BottomSheetScrollView
            bounces={false}
            contentContainerStyle={contentStyle}
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            testID={testID}
          >
            {children}
          </BottomSheetScrollView>
        ) : (
          <View
            style={[styles.nonScrollableContent, contentStyle]}
            testID={testID}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </NativeBottomSheet>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
  },
  nonScrollableContent: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
