import BusinessPicker from "@/components/app/BusinessPicker";
import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  connectCustomer,
  disconnectCustomer,
  getConnectedUsers,
  getConnectionRequests,
  respondToConnectionRequest,
  searchCustomers,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import type {
  BusinessConnection,
  ConnectionUser,
  CustomerSearchResult,
} from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function connectionCustomer(connection: BusinessConnection) {
  return connection.role === "business" ? connection.connected_user : connection.creator;
}

function userName(user: ConnectionUser | CustomerSearchResult | null) {
  return user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : "Unavailable user";
}

export default function ConnectedUsersScreen() {
  const queryClient = useQueryClient();
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const businessUuid = activeBusiness?.uuid;
  const connectionQueryKey = ["connected-users", businessUuid] as const;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const normalizedSearch = searchInput.trim();

  const usersQuery = useQuery({
    queryKey: connectionQueryKey,
    queryFn: () => getConnectedUsers(businessUuid ?? ""),
    enabled: Boolean(businessUuid),
  });
  const requestsQuery = useQuery({
    queryKey: ["connection-requests"],
    queryFn: getConnectionRequests,
    enabled: Boolean(businessUuid),
  });
  const searchQuery = useQuery({
    queryKey: ["customer-search", businessUuid, searchKey],
    queryFn: ({ signal }) => searchCustomers(businessUuid ?? "", searchKey, signal),
    enabled: searchOpen && Boolean(businessUuid) && searchKey.length >= 2,
    staleTime: 60_000,
  });
  const connectMutation = useMutation({
    mutationFn: (customer: CustomerSearchResult) =>
      connectCustomer(businessUuid ?? "", customer.user_id),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: connectionQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["connection-requests"] }),
      ]);
      Alert.alert(
        "Request sent",
        response.message ?? "Connection request sent successfully.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not connect", getApiError(error).message),
  });
  const disconnectMutation = useMutation({
    mutationFn: disconnectCustomer,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: connectionQueryKey });
      Alert.alert(
        "Disconnected",
        response.message ?? "Customer disconnected successfully.",
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
      Alert.alert("Request updated", response.message ?? "Connection request updated.");
    },
    onError: (error) =>
      Alert.alert("Could not update request", getApiError(error).message),
  });

  useEffect(() => {
    if (!searchOpen) return;
    const nextKey = normalizedSearch.length >= 2 ? normalizedSearch : "";
    const timer = setTimeout(() => setSearchKey(nextKey), nextKey ? 300 : 0);
    return () => clearTimeout(timer);
  }, [normalizedSearch, searchOpen]);

  const connections = usersQuery.data?.data ?? [];
  const connectedUserIds = new Set(
    connections.map((connection) =>
      connection.role === "business"
        ? connection.connect_user_id
        : connection.created_by,
    ),
  );
  const requestedUserIds = new Set([
    ...(requestsQuery.data?.data.outgoing ?? [])
      .filter((request) => request.role === "business")
      .map((request) => request.connect_user_id),
    ...(requestsQuery.data?.data.incoming ?? [])
      .filter((request) => request.role === "customer")
      .map((request) => request.created_by),
  ]);
  const suggestions = searchQuery.data?.data ?? [];
  const incomingRequests = (requestsQuery.data?.data.incoming ?? []).filter(
    (request) => request.business?.uuid === businessUuid && request.role === "customer",
  );
  const searchSettled =
    normalizedSearch.length >= 2 && normalizedSearch === searchKey;

  const closeSearch = () => {
    if (connectMutation.isPending) return;
    setSearchOpen(false);
    setSearchInput("");
    setSearchKey("");
  };

  const confirmDisconnect = (connection: BusinessConnection) => {
    Alert.alert(
      "Disconnect customer?",
      `Remove ${userName(connectionCustomer(connection))}?`,
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
      eyebrow="MANAGEMENT"
      title="Connected customers"
      subtitle="Find customers and manage connections for the selected business."
      headerAction={<BusinessPicker />}
      refreshing={usersQuery.isFetching}
      onRefresh={() => void usersQuery.refetch()}
    >
      {!activeBusiness ? (
        <EmptyState
          title="Select a business"
          message="Choose a business above to view its customers."
        />
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.grow}>
              <Text style={styles.sectionTitle}>{activeBusiness.name}</Text>
              <Text style={styles.sectionCopy}>
                {connections.length} connected customers
              </Text>
            </View>
            <Button
              label="Connect"
              size="sm"
              onPress={() => setSearchOpen(true)}
            />
          </View>

          {incomingRequests.length > 0 ? (
            <View style={styles.requestPanel}>
              <View>
                <Text style={styles.requestTitle}>Pending requests</Text>
                <Text style={styles.sectionCopy}>
                  Customers waiting to connect with this business.
                </Text>
              </View>
              {incomingRequests.map((request) => {
                const user = request.creator;
                const responding =
                  responseMutation.isPending &&
                  responseMutation.variables.uuid === request.uuid;
                return (
                  <View style={styles.requestRow} key={request.uuid}>
                    <Avatar user={user} compact />
                    <View style={styles.grow}>
                      <Text numberOfLines={1} style={styles.suggestionName}>
                        {userName(user)}
                      </Text>
                      <Text style={styles.suggestionMeta}>
                        @{user?.username ?? "unavailable"}
                      </Text>
                    </View>
                    <Button
                      label="Decline"
                      variant="ghost"
                      size="sm"
                      disabled={responseMutation.isPending}
                      onPress={() =>
                        responseMutation.mutate({ uuid: request.uuid, status: "rejected" })
                      }
                    />
                    <Button
                      label="Accept"
                      size="sm"
                      loading={responding}
                      disabled={responseMutation.isPending}
                      onPress={() =>
                        responseMutation.mutate({ uuid: request.uuid, status: "approved" })
                      }
                    />
                  </View>
                );
              })}
            </View>
          ) : null}

          {usersQuery.isPending ? (
            <LoadingState label="Loading connected customers…" />
          ) : usersQuery.isError ? (
            <ErrorState
              message={getApiError(usersQuery.error).message}
              retry={() => void usersQuery.refetch()}
            />
          ) : connections.length === 0 ? (
            <EmptyState
              title="No connected customers"
              message={`Search for a customer to connect them to ${activeBusiness.name}.`}
            />
          ) : (
            <View style={styles.cards}>
              {connections.map((connection) => {
                const user = connectionCustomer(connection);
                return (
                  <View style={styles.card} key={connection.uuid}>
                    <View style={styles.row}>
                      <Avatar user={user} />
                      <View style={styles.grow}>
                        <Text numberOfLines={1} style={styles.name}>
                          {userName(user)}
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
                    <Button
                      label="Disconnect"
                      variant="danger"
                      size="sm"
                      loading={
                        disconnectMutation.isPending &&
                        disconnectMutation.variables === connection.uuid
                      }
                      onPress={() => confirmDisconnect(connection)}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <Modal
        visible={searchOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSearch}
      >
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <Text style={styles.modalEyebrow}>CONNECT</Text>
                <Text style={styles.modalTitle}>Find customers</Text>
                <Text style={styles.modalCopy}>
                  Only personal user accounts are shown.
                </Text>
              </View>
              <Button
                label="Close"
                variant="ghost"
                size="sm"
                onPress={closeSearch}
              />
            </View>
            <Input
              label="Search"
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Name, username, email, or phone"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              leftIcon={(color) => (
                <SymbolView
                  name={{ ios: "magnifyingglass", android: "search", web: "search" }}
                  size={18}
                  tintColor={color}
                />
              )}
              rightIcon={
                searchQuery.isFetching
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
              <ErrorState
                message={getApiError(searchQuery.error).message}
                retry={() => void searchQuery.refetch()}
              />
            ) : searchSettled && searchQuery.data ? (
              suggestions.length ? (
                <View style={styles.suggestions}>
                  {suggestions.map((customer) => {
                    const connected = connectedUserIds.has(customer.user_id);
                    const requested = requestedUserIds.has(customer.user_id);
                    return (
                      <View style={styles.suggestion} key={customer.uuid}>
                        <Avatar user={customer} compact />
                        <View style={styles.grow}>
                          <Text numberOfLines={1} style={styles.suggestionName}>
                            {userName(customer)}
                          </Text>
                          <Text numberOfLines={1} style={styles.suggestionMeta}>
                            @{customer.username} · {customer.email}
                          </Text>
                        </View>
                        <Button
                          label={
                            connected
                              ? "Connected"
                              : requested
                                ? "Requested"
                                : "Connect"
                          }
                          size="sm"
                          variant={
                            connected || requested ? "secondary" : "primary"
                          }
                          disabled={
                            connected || requested || connectMutation.isPending
                          }
                          loading={
                            connectMutation.isPending &&
                            connectMutation.variables.user_id === customer.user_id
                          }
                          onPress={() => connectMutation.mutate(customer)}
                        />
                      </View>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  title="No customers found"
                  message={`No user accounts matched “${searchKey}”.`}
                />
              )
            ) : (
              <EmptyState
                title="Search for a customer"
                message="Enter at least two characters to see suggestions."
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Page>
  );
}

function Avatar({
  user,
  compact = false,
}: {
  user: ConnectionUser | CustomerSearchResult | null;
  compact?: boolean;
}) {
  return (
    <View style={[styles.avatar, compact && styles.avatarCompact]}>
      <Text style={styles.initials}>
        {user
          ? `${user.first_name[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
          : "?"}
      </Text>
    </View>
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
  grow: { flex: 1 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
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
  requestPanel: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand100,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  requestTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 14,
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
  avatarCompact: { borderRadius: radii.sm, height: 40, width: 40 },
  initials: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 13,
  },
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
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  detailText: {
    color: colors.slate500,
    flex: 1,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
  },
  modal: { backgroundColor: colors.surface, flex: 1 },
  modalContent: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 48 },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  modalEyebrow: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 26,
    marginTop: 3,
  },
  modalCopy: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginTop: 4,
  },
  searching: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
  },
  suggestions: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  suggestion: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 68,
    padding: spacing.md,
  },
  suggestionName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
  },
  suggestionMeta: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 10,
    marginTop: 2,
  },
});
