import { colors, spacing, typography } from "@/constants/theme";
import TopHeader from "@/components/app/TopHeader";
import type { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface PageProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerAction?: ReactNode;
  backTitle?: string;
}

export default function Page({
  children,
  eyebrow,
  title,
  subtitle,
  refreshing = false,
  onRefresh,
  headerAction,
  backTitle,
}: PageProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand600}
          />
        ) : undefined
      }
    >
      {backTitle ? <TopHeader title={backTitle} /> : null}
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {headerAction}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 40 },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 28,
    letterSpacing: -1,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
});
