import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  connectUser,
  disconnectUser,
  getDirectUserConnections,
  searchDirectUsers,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import type { BusinessConnection } from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

export default function UserConnectionsScreen() {
  const queryClient = useQueryClient();
  const currentUserUuid = useAuthStore((state) => state.user?.uuid);
  const [searchOpen, setSearchOpen] = useState(false);
  const [input, setInput] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const normalizedInput = input.trim();
  const queryKey = ["direct-user-connections"] as const;
  const connectionsQuery = useQuery({
    queryKey,
    queryFn: getDirectUserConnections,
  });
  const searchQuery = useQuery({
    queryKey: ["direct-user-search", searchKey],
    queryFn: ({ signal }) => searchDirectUsers(searchKey, signal),
    enabled: searchOpen && searchKey.length >= 2,
  });
  const connectMutation = useMutation({
    mutationFn: connectUser,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: ["connection-requests"],
      });
      Alert.alert("Request sent", result.message ?? "Connection request sent.");
    },
    onError: (error) =>
      Alert.alert("Could not connect", getApiError(error).message),
  });
  const disconnectMutation = useMutation({
    mutationFn: disconnectUser,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey });
      Alert.alert("Disconnected", result.message ?? "User disconnected.");
    },
    onError: (error) =>
      Alert.alert("Could not disconnect", getApiError(error).message),
  });
  const connections = connectionsQuery.data?.data ?? [];

  useEffect(() => {
    if (!searchOpen) return;
    const timer = setTimeout(
      () => setSearchKey(normalizedInput.length >= 2 ? normalizedInput : ""),
      normalizedInput.length >= 2 ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [normalizedInput, searchOpen]);
  const otherUser = (connection: BusinessConnection) =>
    connection.connected_user?.uuid === currentUserUuid
      ? connection.creator
      : connection.connected_user;
  const confirmDisconnect = (connection: BusinessConnection) => {
    const user = otherUser(connection);
    Alert.alert(
      "Disconnect user?",
      `Remove ${user?.first_name ?? "this user"}?`,
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
      eyebrow="CONNECTIONS"
      title="Connected users"
      subtitle="Connect directly with other Udhari users."
      headerAction={
        <Button label="Connect" size="sm" onPress={() => setSearchOpen(true)} />
      }
      refreshing={connectionsQuery.isFetching}
      onRefresh={() => void connectionsQuery.refetch()}
    >
      {connectionsQuery.isPending ? (
        <LoadingState label="Loading users…" />
      ) : connectionsQuery.isError ? (
        <ErrorState
          message={getApiError(connectionsQuery.error).message}
          retry={() => void connectionsQuery.refetch()}
        />
      ) : connections.length === 0 ? (
        <EmptyState
          title="No connected users"
          message="Search for another user and send a connection request."
        />
      ) : (
        <View style={styles.list}>
          {connections.map((connection) => {
            const user = otherUser(connection);
            return (
              <View style={styles.card} key={connection.uuid}>
                <View style={styles.grow}>
                  <Text style={styles.name}>
                    {user?.first_name} {user?.last_name ?? ""}
                  </Text>
                  <Text style={styles.username}>@{user?.username}</Text>
                  <Text style={styles.email}>{user?.email}</Text>
                </View>
                <Button
                  label="Disconnect"
                  variant="danger"
                  size="sm"
                  onPress={() => confirmDisconnect(connection)}
                />
              </View>
            );
          })}
        </View>
      )}
      <BottomSheet
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        contentContainerStyle={styles.dialog}
      >
        <Text style={styles.title}>Connect a user</Text>
        <Input
          label="Search"
          value={input}
          onChangeText={setInput}
          placeholder="Name, username, email, or phone"
          autoCapitalize="none"
        />
        {searchQuery.isFetching ? (
          <LoadingState label="Searching…" />
        ) : null}
        <View style={styles.results}>
          {(searchQuery.data?.data ?? []).map((user) => (
            <View style={styles.result} key={user.uuid}>
              <View style={styles.grow}>
                <Text style={styles.name}>
                  {user.first_name} {user.last_name ?? ""}
                </Text>
                <Text style={styles.username}>@{user.username}</Text>
              </View>
              <Button
                label="Connect"
                size="sm"
                loading={
                  connectMutation.isPending &&
                  connectMutation.variables === user.user_id
                }
                disabled={connectMutation.isPending}
                onPress={() => connectMutation.mutate(user.user_id)}
              />
            </View>
          ))}
        </View>
        <Button
          label="Close"
          variant="ghost"
          onPress={() => setSearchOpen(false)}
        />
      </BottomSheet>
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
    padding: spacing.lg,
  },
  grow: { flex: 1 },
  name: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 15,
  },
  username: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyBold,
    fontSize: 11,
    marginTop: 2,
  },
  email: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    marginTop: 5,
  },
  dialog: {
    gap: spacing.md,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 20,
  },
  results: { gap: spacing.sm },
  result: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
});
