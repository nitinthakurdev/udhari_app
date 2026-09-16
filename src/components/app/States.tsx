import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.brand600} size="large" />
      <Text style={styles.copy}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.icon}>
        <SymbolView
          name={{ ios: "tray", android: "inbox", web: "inbox" }}
          size={24}
          tintColor={colors.brand600}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <View style={[styles.state, styles.error]}>
      <Text style={[styles.title, styles.errorText]}>
        Couldn&apos;t load data
      </Text>
      <Text style={styles.copy}>{message}</Text>
      <Button label="Try again" variant="outline" size="sm" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 1,
    gap: spacing.md,
    padding: 32,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  error: { backgroundColor: colors.danger50 },
  errorText: { color: colors.danger600 },
  icon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 16,
  },
  copy: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
