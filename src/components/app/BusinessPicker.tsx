import { getBusinesses } from "@/lib/api/businesses";
import { useAuthStore } from "@/stores/authStore";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useQuery } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

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
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
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

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.title}>Select business</Text>
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
                    <View style={styles.optionCopy}>
                      <Text numberOfLines={1} style={styles.optionName}>
                        {business.name}
                      </Text>
                      <Text style={styles.slug}>/{business.slug}</Text>
                    </View>
                    {selected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  backdrop: {
    backgroundColor: "rgba(15,23,42,.4)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    padding: spacing.xl,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 18,
  },
  list: { gap: spacing.sm, marginTop: spacing.lg },
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
  optionCopy: { flex: 1 },
  optionName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
  },
  slug: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 10,
    marginTop: 2,
  },
  check: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 18,
  },
});
