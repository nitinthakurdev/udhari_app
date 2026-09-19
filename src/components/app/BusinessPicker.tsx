import { getBusinesses } from "@/lib/api/businesses";
import { useAuthStore } from "@/stores/authStore";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useQuery } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";

export default function BusinessPicker() {
  const [open, setOpen] = useState(false);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const setActiveBusiness = useAuthStore((state) => state.setActiveBusiness);
  const businessesQuery = useQuery({
    queryKey: ["businesses"],
    queryFn: getBusinesses,
  });
  const businesses = businessesQuery.data?.data ?? [];

  if (!activeBusiness && businesses.length === 0) return null;

  return (
    <>
      <Pressable
        accessibilityLabel={`Switch business. Current business: ${activeBusiness?.name ?? "none"}`}
        accessibilityRole="button"
        style={styles.trigger}
        onPress={() => setOpen(true)}
      >
        <SymbolView
          name={{ ios: "building.2", android: "business", web: "business" }}
          size={17}
          tintColor={colors.brand600}
        />
        <Text numberOfLines={1} style={styles.triggerText}>
          {activeBusiness?.name ?? "Select business"}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        contentContainerStyle={styles.sheetContent}
        initialSnapIndex={0}
      >
        <Text style={styles.title}>Switch business</Text>
        <View style={styles.list}>
          {businesses.map((business) => {
            const selected = business.uuid === activeBusiness?.uuid;

            return (
              <Pressable
                key={business.uuid}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => {
                  setActiveBusiness(business);
                  setOpen(false);
                }}
              >
                <View style={styles.optionIcon}>
                  <SymbolView
                    name={{
                      ios: "storefront",
                      android: "storefront",
                      web: "storefront",
                    }}
                    size={18}
                    tintColor={colors.brand600}
                  />
                </View>
                <Text numberOfLines={1} style={styles.optionName}>
                  {business.name}
                </Text>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 190,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  triggerText: {
    color: colors.slate700,
    flexShrink: 1,
    fontFamily: typography.fontFamilyBold,
    fontSize: 11,
  },
  chevron: { color: colors.slate500, fontSize: 14 },
  sheetContent: { gap: spacing.lg },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 18,
  },
  list: { gap: spacing.sm },
  option: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  optionSelected: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
  },
  optionIcon: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  optionName: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
  },
  check: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 18,
  },
});
