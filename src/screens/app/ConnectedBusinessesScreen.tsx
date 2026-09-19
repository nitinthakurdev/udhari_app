import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { searchBusinesses } from "@/lib/api/businesses";
import {
  connectBusiness,
  disconnectBusiness,
  getBusinessConnections,
  getConnectionRequests,
  respondToConnectionRequest,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import { getTransitionSummary } from "@/lib/api/transitions";
import { useAuthStore } from "@/stores/authStore";
import type { BusinessConnection } from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

const connectionQueryKey = ["business-connections"] as const;

function getCounterpartBusiness(
  connection: BusinessConnection,
  activeBusinessUuid?: string,
) {
  return connection.source_business?.uuid === activeBusinessUuid
    ? connection.business
    : (connection.source_business ?? connection.business);
}

function getCounterpartBusinessId(
  connection: BusinessConnection,
  activeBusinessUuid?: string,
) {
  return connection.source_business?.uuid === activeBusinessUuid
    ? (connection.business_id ?? 0)
    : (connection.source_business_id ?? connection.business_id ?? 0);
}

function getOutstandingAmount(
  parties: {
    party_type: "user" | "business";
    party_id: number;
    amount: number;
  }[],
  businessId: number,
) {
  return parties.reduce(
    (total, party) =>
      party.party_type === "business" && party.party_id === businessId
        ? total + Math.abs(Number(party.amount))
        : total,
    0,
  );
}

function formatAmount(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function ConnectedBusinessesScreen() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.user_role?.slug);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const businessMode = role === "business";
  const [searchInput, setSearchInput] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [checkingConnectionUuid, setCheckingConnectionUuid] = useState<
    string | null
  >(null);
  const connectionsQuery = useQuery({
    queryKey: [
      ...connectionQueryKey,
      businessMode ? activeBusiness?.uuid : "user",
    ],
    queryFn: () =>
      getBusinessConnections(businessMode ? activeBusiness?.uuid : undefined),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const requestsQuery = useQuery({
    queryKey: ["connection-requests"],
    queryFn: getConnectionRequests,
  });
  const transitionSummaryQuery = useQuery({
    queryKey: [
      "transition-summary",
      businessMode ? activeBusiness?.uuid : "user",
    ],
    queryFn: () =>
      getTransitionSummary(businessMode ? activeBusiness?.uuid : undefined),
    enabled: !businessMode || Boolean(activeBusiness?.uuid),
  });
  const searchQuery = useQuery({
    queryKey: ["business-search", searchKey],
    queryFn: ({ signal }) => searchBusinesses(searchKey, signal),
    enabled: searchKey.length >= 2,
    staleTime: 60_000,
  });
  const connectMutation = useMutation({
    mutationFn: (business: Parameters<typeof connectBusiness>[0]) =>
      connectBusiness(
        business,
        businessMode ? activeBusiness?.uuid : undefined,
      ),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: connectionQueryKey });
      Alert.alert(
        "Connected",
        response.message ?? "Business connected successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not connect", getApiError(error).message),
  });
  const disconnectMutation = useMutation({
    mutationFn: disconnectBusiness,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: connectionQueryKey });
      Alert.alert(
        "Disconnected",
        response.message ?? "Business disconnected successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not disconnect", getApiError(error).message),
  });
  const responseMutation = useMutation({
    mutationFn: ({
      uuid,
      status,
    }: {
      uuid: string;
      status: "approved" | "rejected";
    }) => respondToConnectionRequest(uuid, status),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: connectionQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["connection-requests"] }),
      ]);
      Alert.alert(
        "Request updated",
        response.message ?? "Connection request updated.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not update request", getApiError(error).message),
  });
  const normalizedSearch = searchInput.trim();

  useEffect(() => {
    const nextKey = normalizedSearch.length >= 2 ? normalizedSearch : "";
    const timer = setTimeout(() => setSearchKey(nextKey), nextKey ? 350 : 0);
    return () => clearTimeout(timer);
  }, [normalizedSearch]);

  const connections = connectionsQuery.data?.data ?? [];
  const connectedIds = new Set(
    connections.map((connection) =>
      getCounterpartBusinessId(connection, activeBusiness?.uuid),
    ),
  );
  const suggestions =
    searchQuery.data?.data.filter(
      (business) => !connectedIds.has(business.business_id),
    ) ?? [];
  const incomingRequests = (requestsQuery.data?.data.incoming ?? []).filter(
    (request) => request.role === "business",
  );
  const searchSettled =
    normalizedSearch.length >= 2 && normalizedSearch === searchKey;

  const confirmDisconnect = async (connection: BusinessConnection) => {
    setCheckingConnectionUuid(connection.uuid);
    const summaryResult = await transitionSummaryQuery.refetch();
    setCheckingConnectionUuid(null);

    if (summaryResult.isError || !summaryResult.data) {
      Alert.alert(
        "Could not verify balance",
        summaryResult.error
          ? getApiError(summaryResult.error).message
          : "Please try again before disconnecting this business.",
      );
      return;
    }

    const counterpartId = getCounterpartBusinessId(
      connection,
      activeBusiness?.uuid,
    );
    const outstandingAmount = getOutstandingAmount(
      summaryResult.data.data.parties,
      counterpartId,
    );
    const counterpartName =
      getCounterpartBusiness(connection, activeBusiness?.uuid)?.name ??
      "this business";

    if (outstandingAmount > 0) {
      Alert.alert(
        "Full payment required",
        `${counterpartName} has an outstanding balance of ${formatAmount(outstandingAmount)}. Complete all payable and receivable payments before disconnecting.`,
      );
      return;
    }

    Alert.alert(
      "Disconnect business?",
      `Remove ${counterpartName} from your connections?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnectMutation.mutate(connection.uuid),
        },
      ],
    );
  };

  return (
    <Page
      backTitle="Configuration"
      eyebrow="MANAGEMENT"
      title="Connected businesses"
      subtitle="Find businesses owned by other accounts and manage your connections."
      refreshing={
        connectionsQuery.isFetching || transitionSummaryQuery.isFetching
      }
      onRefresh={() =>
        void Promise.all([
          connectionsQuery.refetch(),
          transitionSummaryQuery.refetch(),
        ])
      }
    >
      <View style={styles.searchPanel}>
        <Text style={styles.panelTitle}>Find a business</Text>
        <Text style={styles.panelCopy}>Suggestions appear as you type.</Text>
        <Input
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Business name or slug"
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={(color) => (
            <SymbolView
              name={{
                ios: "magnifyingglass",
                android: "search",
                web: "search",
              }}
              size={18}
              tintColor={color}
            />
          )}
          rightIcon={
            normalizedSearch.length >= 2 &&
            (!searchSettled || searchQuery.isFetching)
              ? () => <Text style={styles.searching}>•••</Text>
              : undefined
          }
          helperText={
            normalizedSearch.length === 1
              ? "Type one more character."
              : undefined
          }
        />

        {searchSettled && searchQuery.isError ? (
          <Text style={styles.errorText}>
            {getApiError(searchQuery.error).message}
          </Text>
        ) : null}
        {searchSettled && searchQuery.data ? (
          <View style={styles.suggestions}>
            {suggestions.length ? (
              suggestions.map((business) => (
                <View style={styles.suggestion} key={business.uuid}>
                  <View style={styles.businessIcon}>
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
                  <View style={styles.grow}>
                    <Text numberOfLines={1} style={styles.businessName}>
                      {business.name}
                    </Text>
                    <Text style={styles.slug}>/{business.slug}</Text>
                  </View>
                  <Button
                    label="Connect"
                    size="sm"
                    loading={
                      connectMutation.isPending &&
                      connectMutation.variables.business_id ===
                        business.business_id
                    }
                    disabled={connectMutation.isPending}
                    onPress={() => connectMutation.mutate(business)}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.emptySuggestion}>
                {searchQuery.data.data.length
                  ? "All matching businesses are already connected."
                  : `No businesses matched “${searchKey}”.`}
              </Text>
            )}
          </View>
        ) : null}
      </View>

      {incomingRequests.length > 0 ? (
        <View style={styles.requestPanel}>
          <View>
            <Text style={styles.sectionTitle}>Business invitations</Text>
            <Text style={styles.sectionCopy}>
              Review businesses that want to connect with you.
            </Text>
          </View>
          {incomingRequests.map((request) => {
            const responding =
              responseMutation.isPending &&
              responseMutation.variables.uuid === request.uuid;
            return (
              <View style={styles.requestRow} key={request.uuid}>
                <View style={styles.businessIcon}>
                  <SymbolView
                    name={{
                      ios: "building.2",
                      android: "business",
                      web: "business",
                    }}
                    size={18}
                    tintColor={colors.brand600}
                  />
                </View>
                <View style={styles.grow}>
                  <Text numberOfLines={1} style={styles.businessName}>
                    {request.business?.name ?? "Business invitation"}
                  </Text>
                  <Text style={styles.slug}>
                    /{request.business?.slug ?? "business"}
                  </Text>
                </View>
                <Button
                  label="Decline"
                  variant="ghost"
                  size="sm"
                  disabled={responseMutation.isPending}
                  onPress={() =>
                    responseMutation.mutate({
                      uuid: request.uuid,
                      status: "rejected",
                    })
                  }
                />
                <Button
                  label="Accept"
                  size="sm"
                  loading={responding}
                  disabled={responseMutation.isPending}
                  onPress={() =>
                    responseMutation.mutate({
                      uuid: request.uuid,
                      status: "approved",
                    })
                  }
                />
              </View>
            );
          })}
        </View>
      ) : null}

      <View>
        <Text style={styles.sectionTitle}>Your connections</Text>
        <Text style={styles.sectionCopy}>{connections.length} connected</Text>
      </View>
      {connectionsQuery.isPending ? (
        <LoadingState label="Loading connections…" />
      ) : connectionsQuery.isError ? (
        <ErrorState
          message={getApiError(connectionsQuery.error).message}
          retry={() => void connectionsQuery.refetch()}
        />
      ) : connections.length === 0 ? (
        <EmptyState
          title="No connected businesses"
          message="Search above to connect with a business."
        />
      ) : (
        <View style={styles.cards}>
          {connections.map((connection) => (
            <View style={styles.card} key={connection.uuid}>
              <View style={styles.row}>
                <View style={styles.businessIcon}>
                  <SymbolView
                    name={{
                      ios: "building.2",
                      android: "business",
                      web: "business",
                    }}
                    size={20}
                    tintColor={colors.brand600}
                  />
                </View>
                <View style={styles.grow}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {getCounterpartBusiness(connection, activeBusiness?.uuid)
                      ?.name ?? "Unavailable business"}
                  </Text>
                  <Text style={styles.slug}>
                    /
                    {getCounterpartBusiness(connection, activeBusiness?.uuid)
                      ?.slug ?? "unavailable"}
                  </Text>
                </View>
                <Text style={styles.badge}>CONNECTED</Text>
              </View>
              <Text style={styles.owner}>
                Owner: {connection.connected_user?.first_name ?? "Unavailable"}
              </Text>
              <Button
                label="Disconnect"
                variant="danger"
                size="sm"
                loading={
                  checkingConnectionUuid === connection.uuid ||
                  (disconnectMutation.isPending &&
                    disconnectMutation.variables === connection.uuid)
                }
                disabled={
                  checkingConnectionUuid !== null ||
                  disconnectMutation.isPending
                }
                onPress={() => void confirmDisconnect(connection)}
              />
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  searchPanel: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  requestPanel: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand100,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  requestRow: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
  },
  panelTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 16,
  },
  panelCopy: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  searching: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
  },
  errorText: {
    color: colors.danger600,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 12,
  },
  suggestions: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  suggestion: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  businessIcon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  grow: { flex: 1 },
  businessName: {
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
  emptySuggestion: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    padding: spacing.md,
    textAlign: "center",
  },
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
    gap: spacing.md,
    padding: spacing.lg,
  },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
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
  owner: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
  },
});
