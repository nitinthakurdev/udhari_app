import type { ReactNode } from "react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { Images } from "@/constants/images";
import { colors, radii, spacing, typography } from "@/constants/theme";

type AuthScaffoldProps = {
  children: ReactNode;
  eyebrow: string;
  footer: ReactNode;
  subtitle: string;
  title: string;
};

export default function AuthScaffold({
  children,
  eyebrow,
  footer,
  subtitle,
  title,
}: AuthScaffoldProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : 'height'}
      style={styles.screen}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.decoration}>
            <View style={styles.largeCircle} />
            <View style={styles.smallCircle} />
          </View>

          <View style={styles.topBar}>
            <Button
              label="Back"
              variant="secondary"
              size="sm"
              leftIcon={(color) => (
                <SymbolView
                  name={{
                    ios: "chevron.left",
                    android: "arrow_back",
                    web: "arrow_back",
                  }}
                  size={16}
                  tintColor={color}
                />
              )}
              onPress={() => router.back()}
              style={styles.backButton}
            />

            <View style={styles.brandRow}>
              <View style={styles.logoBox}>
                <Image
                  contentFit="contain"
                  source={Images.logo}
                  style={styles.logo}
                />
              </View>
              <Text style={styles.brandName}>udhari</Text>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.formWidth}>{children}</View>
          <View style={styles.footer}>{footer}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.brand600, flex: 1 },
  scrollContent: { backgroundColor: colors.surface, flexGrow: 1 },
  hero: {
    backgroundColor: colors.brand600,
    overflow: "hidden",
    paddingBottom: 64,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  decoration: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  largeCircle: {
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 145,
    borderWidth: 36,
    height: 290,
    position: "absolute",
    right: -115,
    top: -105,
    width: 290,
  },
  smallCircle: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 58,
    bottom: -26,
    height: 116,
    left: -42,
    position: "absolute",
    width: 116,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: { borderRadius: radii.full },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  logoBox: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  logo: { height: 33, width: 35 },
  brandName: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
    letterSpacing: -0.8,
  },
  heroCopy: { marginTop: 48, maxWidth: 500 },
  eyebrow: {
    color: colors.brand100,
    fontFamily: typography.fontFamilyBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 36,
    letterSpacing: -1.6,
    lineHeight: 41,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.brand100,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md,
    maxWidth: 420,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    marginTop: -30,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 34,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: colors.line,
    borderRadius: radii.full,
    height: 4,
    marginBottom: 26,
    width: 42,
  },
  formWidth: { alignSelf: "center", maxWidth: 500, width: "100%" },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
});
