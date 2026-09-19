import Page from "@/components/app/Page";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ConfigurationItem = {
  title: string;
  description: string;
  href: Href;
  icon: SymbolViewProps["name"];
};

const businessConfigurationItems: ConfigurationItem[] = [
  {
    title: "Scheduled transactions",
    description:
      "Schedule product and service entries for connected customers.",
    href: "/(app)/(business)/configuration/scheduled-transactions",
    icon: {
      ios: "calendar.badge.clock",
      android: "event_repeat",
      web: "event_repeat",
    },
  },
  {
    title: "Monthly billing",
    description:
      "Track statements, outstanding balances, and received payments.",
    href: "/(app)/(business)/configuration/billing" as Href,
    icon: { ios: "doc.text", android: "receipt_long", web: "receipt_long" },
  },
  {
    title: "Business management",
    description: "Create, edit, and choose your default business.",
    href: "/(app)/(business)/configuration/businesses",
    icon: { ios: "storefront", android: "storefront", web: "storefront" },
  },
  {
    title: "Units",
    description: "Manage the units used for ledger entries.",
    href: "/(app)/(business)/configuration/units",
    icon: { ios: "ruler", android: "straighten", web: "straighten" },
  },
  {
    title: "Connect business",
    description: "Find and connect with another business.",
    href: "/(app)/(business)/configuration/connect-business",
    icon: { ios: "building.2", android: "business", web: "business" },
  },
  {
    title: "Connect customer",
    description: "Search for customers and manage connections.",
    href: "/(app)/(business)/configuration/connect-customer",
    icon: { ios: "person.2", android: "group", web: "group" },
  },
];

const userConfigurationItems: ConfigurationItem[] = [
  {
    title: "Connect users",
    description: "Find and connect directly with other Udhari users.",
    href: "/(app)/(user)/configuration/connect-user",
    icon: { ios: "person.2", android: "group_add", web: "group_add" },
  },
  {
    title: "Scheduled transactions",
    description:
      "Schedule product and service entries with connected businesses.",
    href: "/(app)/(user)/configuration/scheduled-transactions",
    icon: {
      ios: "calendar.badge.clock",
      android: "event_repeat",
      web: "event_repeat",
    },
  },
  {
    title: "Monthly billing",
    description: "View monthly statements and payment history.",
    href: "/(app)/(user)/configuration/billing" as Href,
    icon: { ios: "doc.text", android: "receipt_long", web: "receipt_long" },
  },
  {
    title: "Connect business",
    description: "Find businesses and manage your active connections.",
    href: "/(app)/(user)/connect-business",
    icon: { ios: "building.2", android: "business", web: "business" },
  },
];

export default function ConfigurationScreen() {
  const router = useRouter();
  const isBusiness = useAuthStore(
    (state) => state.user?.user_role?.slug === "business",
  );
  const configurationItems = isBusiness
    ? businessConfigurationItems
    : userConfigurationItems;

  return (
    <Page
      eyebrow="WORKSPACE"
      title="Configuration"
      subtitle={
        isBusiness
          ? "Business tools and connection settings in one place."
          : "Manage your business connections in one place."
      }
    >
      <View style={styles.list}>
        {configurationItems.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.title}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.icon}>
              <SymbolView
                name={item.icon}
                size={21}
                tintColor={colors.brand600}
              />
            </View>
            <View style={styles.grow}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
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
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 82,
    padding: spacing.lg,
  },
  cardPressed: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  grow: { flex: 1 },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
  },
  description: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
});
