import BusinessPicker from "@/components/app/BusinessPicker";
import Page from "@/components/app/Page";
import { ErrorState, LoadingState } from "@/components/app/States";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getBusinesses } from "@/lib/api/businesses";
import {
  getBusinessConnections,
  getConnectedUsers,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const businessesQuery = useQuery({
    queryKey: ["businesses"],
    queryFn: getBusinesses,
  });
  const connectionsQuery = useQuery({
    queryKey: ["business-connections"],
    queryFn: getBusinessConnections,
  });
  const usersQuery = useQuery({
    queryKey: ["connected-users", activeBusiness?.uuid],
    queryFn: () => getConnectedUsers(activeBusiness?.uuid ?? ""),
    enabled:
      user?.user_role?.slug === "business" && Boolean(activeBusiness?.uuid),
  });
  const refreshing =
    businessesQuery.isFetching ||
    connectionsQuery.isFetching ||
    usersQuery.isFetching;
  const refresh = () => {
    void businessesQuery.refetch();
    void connectionsQuery.refetch();
    if (activeBusiness) void usersQuery.refetch();
  };

  return (
    <Page
      eyebrow="OVERVIEW"
      title={`Hello, ${user?.first_name ?? "there"}`}
      subtitle="Your Udhari workspace at a glance."
      headerAction={<BusinessPicker />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {businessesQuery.isPending || connectionsQuery.isPending ? (
        <LoadingState label="Loading your workspace…" />
      ) : businessesQuery.isError || connectionsQuery.isError ? (
        <ErrorState
          message={
            getApiError(businessesQuery.error ?? connectionsQuery.error).message
          }
          retry={refresh}
        />
      ) : (
        <View style={styles.grid}>
          <SummaryCard
            icon={{ ios: "building.2", android: "business", web: "business" }}
            label="Your businesses"
            value={businessesQuery.data.data.length}
          />
          <SummaryCard
            icon={{ ios: "link", android: "link", web: "link" }}
            label="Connected businesses"
            value={connectionsQuery.data.data.length}
          />
          {user?.user_role?.slug === "business" ? (
            <SummaryCard
              icon={{ ios: "person.2", android: "group", web: "group" }}
              label="Connected users"
              value={usersQuery.data?.data.length ?? 0}
            />
          ) : null}
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>CURRENT BUSINESS</Text>
        <Text style={styles.panelTitle}>
          {activeBusiness?.name ?? "No business selected"}
        </Text>
        <Text style={styles.panelCopy}>
          {activeBusiness
            ? `${activeBusiness.city}, ${activeBusiness.state} · /${activeBusiness.slug}`
            : "Create a business or connect with one to get started."}
        </Text>
      </View>
    </Page>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value: number;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <SymbolView name={icon} size={20} tintColor={colors.brand600} />
      </View>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  card: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.lg,
    padding: spacing.lg,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  label: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 11,
  },
  value: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 24,
    marginTop: 2,
  },
  panel: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  panelEyebrow: {
    color: colors.brand200,
    fontFamily: typography.fontFamilyBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  panelTitle: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
    marginTop: spacing.sm,
  },
  panelCopy: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
