import { colors, radii, spacing, typography } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TopHeaderProps {
  title: string;
}

export default function TopHeader({ title }: TopHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`Back from ${title}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
      >
        <SymbolView
          name={{
            ios: "chevron.left",
            android: "arrow_back",
            web: "arrow_back",
          }}
          size={19}
          tintColor={colors.brand600}
        />
      </Pressable>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.full,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  backButtonPressed: { backgroundColor: colors.brand50 },
  title: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
});
