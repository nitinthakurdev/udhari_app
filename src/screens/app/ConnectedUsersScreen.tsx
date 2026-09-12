import BusinessPicker from "@/components/app/BusinessPicker";
import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getConnectedUsers } from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

export default function ConnectedUsersScreen() {
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const usersQuery = useQuery({
    queryKey: ["connected-users", activeBusiness?.uuid],
    queryFn: () => getConnectedUsers(activeBusiness?.uuid ?? ""),
    enabled: Boolean(activeBusiness?.uuid),
  });
  const connections = usersQuery.data?.data ?? [];

  return (
    <Page
      eyebrow="MANAGEMENT"
      title="Connected users"
      subtitle="Users connected to the currently selected business."
      headerAction={<BusinessPicker />}
      refreshing={usersQuery.isFetching}
      onRefresh={() => void usersQuery.refetch()}
    >
      {!activeBusiness ? (
        <EmptyState
          title="Select a business"
          message="Choose a business above to view its users."
        />
      ) : usersQuery.isPending ? (
        <LoadingState label="Loading connected users…" />
      ) : usersQuery.isError ? (
        <ErrorState
          message={getApiError(usersQuery.error).message}
          retry={() => void usersQuery.refetch()}
        />
      ) : connections.length === 0 ? (
        <EmptyState
          title="No connected users"
          message={`Users will appear after they connect to ${activeBusiness.name}.`}
        />
      ) : (
        <>
          <View>
            <Text style={styles.sectionTitle}>{activeBusiness.name}</Text>
            <Text style={styles.sectionCopy}>
              {connections.length} connected users
            </Text>
          </View>
          <View style={styles.cards}>
            {connections.map((connection) => {
              const user = connection.creator;
              const fullName = user
                ? [user.first_name, user.last_name].filter(Boolean).join(" ")
                : "Unavailable user";

              return (
                <View style={styles.card} key={connection.uuid}>
                  <View style={styles.row}>
                    <View style={styles.avatar}>
                      <Text style={styles.initials}>
                        {user
                          ? `${user.first_name[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
                          : "?"}
                      </Text>
                    </View>
                    <View style={styles.grow}>
                      <Text numberOfLines={1} style={styles.name}>
                        {fullName}
                      </Text>
                      <Text style={styles.username}>
                        @{user?.username ?? "unavailable"}
                      </Text>
                    </View>
                    <Text style={styles.badge}>CONNECTED</Text>
                  </View>
                  {user ? (
                    <View style={styles.details}>
                      <Detail
                        icon={{ ios: "envelope", android: "mail", web: "mail" }}
                        value={user.email}
                      />
                      <Detail
                        icon={{ ios: "phone", android: "phone", web: "phone" }}
                        value={`${user.dial_code ?? ""} ${user.phone}`.trim()}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      )}
    </Page>
  );
}

function Detail({
  icon,
  value,
}: {
  icon: SymbolViewProps["name"];
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <SymbolView name={icon} size={15} tintColor={colors.slate500} />
      <Text numberOfLines={1} style={styles.detailText}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 17,
  },
  sectionCopy: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginTop: 3,
  },
  cards: { gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  initials: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 14,
  },
  grow: { flex: 1 },
  name: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
  },
  username: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#ecfdf3",
    borderRadius: radii.full,
    color: "#047857",
    fontFamily: typography.fontFamilyBold,
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  details: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  detailRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  detailText: {
    color: colors.slate500,
    flex: 1,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
  },
});
