import Page from "@/components/app/Page";
import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { logout } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const accountItems: {
  path: string;
  label: string;
  description: string;
  icon: SymbolViewProps["name"];
}[] = [
  {
    path: "upgrade",
    label: "Upgrade plan",
    description: "Compare plans and increase your account limits.",
    icon: { ios: "crown", android: "workspace_premium", web: "workspace_premium" },
  },
  {
    path: "personal-info",
    label: "Personal info",
    description: "View your account and contact details.",
    icon: { ios: "person", android: "person", web: "person" },
  },
  {
    path: "change-password",
    label: "Change password",
    description: "Update your password and protect your account.",
    icon: { ios: "key", android: "key", web: "key" },
  },
  {
    path: "privacy-policy",
    label: "Privacy policy",
    description: "Learn how your information is handled.",
    icon: { ios: "lock.shield", android: "shield", web: "shield" },
  },
  {
    path: "help",
    label: "Help & support",
    description: "Get guidance for your account and connections.",
    icon: { ios: "questionmark.circle", android: "help", web: "help" },
  },
  {
    path: "faq",
    label: "FAQ",
    description: "Find answers to common questions.",
    icon: { ios: "text.bubble", android: "chat", web: "chat" },
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const isBusiness = user?.user_role?.slug === "business";
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      clearSession();
    },
  });
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : "Udhari user";
  const initials = user
    ? `${user.first_name[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "U";

  const openAccountPage = (path: string) => {
    const rolePath = isBusiness ? "(business)" : "(user)";
    router.push(`/(app)/${rolePath}/account/${path}` as Href);
  };

  return (
    <Page
      eyebrow="ACCOUNT"
      title="Your account"
      subtitle="Manage your profile, privacy, and support settings."
    >
      <View style={styles.hero}>
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
          <View style={styles.roleBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.role}>{user?.user_role?.name ?? "User"}</Text>
          </View>
        </View>
        <View style={styles.secureBadge}>
          <SymbolView
            name={{
              ios: "checkmark.shield.fill",
              android: "verified_user",
              web: "verified_user",
            }}
            size={20}
            tintColor={colors.white}
          />
        </View>
      </View>

      <View style={styles.accountMenu}>
        <View style={styles.menuHeading}>
          <Text style={styles.menuTitle}>Account settings</Text>
          <Text style={styles.menuSubtitle}>Choose what you want to manage</Text>
        </View>
        {accountItems.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.path}
            onPress={() => openAccountPage(item.path)}
            style={({ pressed }) => [
              styles.menuCard,
              pressed && styles.menuCardPressed,
            ]}
          >
            <View style={styles.menuIcon}>
              <SymbolView
                name={item.icon}
                size={20}
                tintColor={colors.brand600}
              />
            </View>
            <View style={styles.grow}>
              <Text style={styles.menuItemTitle}>{item.label}</Text>
              <Text style={styles.menuItemDescription}>{item.description}</Text>
            </View>
            <SymbolView
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              size={18}
              tintColor={colors.slate400}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.logoutPanel}>
        <View style={styles.logoutCopy}>
          <Text style={styles.logoutTitle}>Sign out of Udhari</Text>
          <Text style={styles.logoutText}>
            You can securely sign in again anytime.
          </Text>
        </View>
        <Button
          label="Log out"
          variant="danger"
          size="sm"
          loading={logoutMutation.isPending}
          onPress={() => logoutMutation.mutate()}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    backgroundColor: colors.brand600,
    borderRadius: 22,
    elevation: 5,
    flexDirection: "row",
    gap: spacing.lg,
    minHeight: 126,
    overflow: "hidden",
    padding: spacing.xl + 2,
    shadowColor: colors.brand700,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  heroOrbLarge: {
    backgroundColor: "rgba(255,255,255,.09)",
    borderRadius: radii.full,
    height: 150,
    position: "absolute",
    right: -55,
    top: -70,
    width: 150,
  },
  heroOrbSmall: {
    backgroundColor: "rgba(255,255,255,.08)",
    borderRadius: radii.full,
    bottom: -45,
    height: 90,
    left: 76,
    position: "absolute",
    width: 90,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "rgba(255,255,255,.45)",
    borderRadius: 21,
    borderWidth: 3,
    height: 68,
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    width: 68,
  },
  initials: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 22,
  },
  grow: { flex: 1 },
  name: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 21,
    letterSpacing: -0.4,
  },
  username: {
    color: "rgba(255,255,255,.75)",
    fontFamily: typography.fontFamilyMedium,
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,.14)",
    borderRadius: radii.full,
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  onlineDot: {
    backgroundColor: "#86efac",
    borderRadius: radii.full,
    height: 6,
    width: 6,
  },
  role: {
    color: colors.white,
    fontFamily: typography.fontFamilyBold,
    fontSize: 9,
    textTransform: "uppercase",
  },
  secureBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.14)",
    borderRadius: radii.full,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  accountMenu: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    overflow: "hidden",
    padding: spacing.sm,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  menuHeading: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  menuTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 16,
  },
  menuSubtitle: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginTop: 3,
  },
  menuCard: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 70,
    padding: spacing.md,
  },
  menuCardPressed: { backgroundColor: colors.brand50 },
  menuIcon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  menuItemTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 14,
  },
  menuItemDescription: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  logoutPanel: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  logoutCopy: { flex: 1 },
  logoutTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
  },
  logoutText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
});
