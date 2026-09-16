import { colors, spacing, typography } from "@/constants/theme";
import TopHeader from "@/components/app/TopHeader";
import { Images } from "@/constants/images";
import { Image } from "expo-image";
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
  showBrand?: boolean;
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
  showBrand = false,
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
      {showBrand ? (
        <View style={styles.brandBar}>
          <View style={styles.logoBox}>
            <Image
              contentFit="contain"
              source={Images.logo}
              style={styles.logo}
            />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>udhari</Text>
            <Text style={styles.brandTagline}>YOUR EVERYDAY LEDGER</Text>
          </View>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>₹ INR</Text>
          </View>
        </View>
      ) : null}
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
  content: {
    alignSelf: "center",
    gap: 24,
    maxWidth: 760,
    paddingBottom: 48,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    width: "100%",
  },
  brandBar: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 48,
  },
  logoBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    width: 46,
  },
  logo: { height: 38, width: 38 },
  brandCopy: { flex: 1, marginLeft: spacing.md },
  brandName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
    letterSpacing: -0.8,
  },
  brandTagline: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyBold,
    fontSize: 8,
    letterSpacing: 1.25,
    marginTop: 1,
  },
  currencyBadge: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  currencyText: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: 2,
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
    fontSize: 30,
    letterSpacing: -1.2,
    lineHeight: 36,
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
