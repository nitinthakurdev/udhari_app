import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  getConnectionRequests,
  respondToConnectionRequest,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import type { BusinessConnection } from "@/types/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";

export default function RequestsScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const isBusiness = useAuthStore(
    (state) => state.user?.user_role?.slug === "business",
  );
  const requestsQuery = useQuery({
    queryKey: ["connection-requests"],
    queryFn: getConnectionRequests,
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
        queryClient.invalidateQueries({ queryKey: ["connection-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["business-connections"] }),
        queryClient.invalidateQueries({ queryKey: ["connected-users"] }),
      ]);
      Alert.alert("Request updated", response.message ?? "Connection request updated.");
    },
    onError: (error) =>
      Alert.alert("Could not update request", getApiError(error).message),
  });
  const incoming = requestsQuery.data?.data.incoming ?? [];
  const outgoing = requestsQuery.data?.data.outgoing ?? [];

  return (
    <Page
      eyebrow="INBOX"
      title="Requests"
      subtitle="Review incoming invitations and track requests you have sent."
      headerAction={
        !isBusiness ? (
          <Button
            label="Find business"
            size="sm"
            onPress={() => router.push("/(app)/(user)/connect-business")}
          />
        ) : undefined
      }
      refreshing={requestsQuery.isFetching}
      onRefresh={() => void requestsQuery.refetch()}
    >
      {requestsQuery.isPending ? (
        <LoadingState label="Loading requests…" />
      ) : requestsQuery.isError ? (
        <ErrorState
          message={getApiError(requestsQuery.error).message}
          retry={() => void requestsQuery.refetch()}
        />
      ) : incoming.length === 0 && outgoing.length === 0 ? (
        <EmptyState
          title="No pending requests"
          message="New connection invitations will appear here."
        />
      ) : (
        <>
          <RequestSection
            title="Incoming"
            requests={incoming}
            isBusiness={isBusiness}
            responseMutation={responseMutation}
          />
          <RequestSection
            title="Sent"
            requests={outgoing}
            isBusiness={isBusiness}
          />
        </>
      )}
    </Page>
  );
}

function RequestSection({
  title,
  requests,
  isBusiness,
  responseMutation,
}: {
  title: string;
  requests: BusinessConnection[];
  isBusiness: boolean;
  responseMutation?: ReturnType<
    typeof useMutation<
      Awaited<ReturnType<typeof respondToConnectionRequest>>,
      Error,
      { uuid: string; status: "approved" | "rejected" }
    >
  >;
}) {
  if (requests.length === 0) return null;

  return (
    <View style={styles.section}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCopy}>{requests.length} pending</Text>
      </View>
      {requests.map((request) => {
        const titleText = requestTitle(request, isBusiness);
        const subtitle = request.business?.name
          ? `Business: ${request.business.name}`
          : request.role === "business"
            ? "Customer invitation"
            : "Business connection";
        const responding =
          responseMutation?.isPending &&
          responseMutation.variables.uuid === request.uuid;

        return (
          <View style={styles.card} key={request.uuid}>
            <View style={styles.row}>
              <View style={styles.icon}>
                <SymbolView
                  name={{ ios: "person.2", android: "group", web: "group" }}
                  size={19}
                  tintColor={colors.brand600}
                />
              </View>
              <View style={styles.grow}>
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {titleText}
                </Text>
                <Text numberOfLines={1} style={styles.cardCopy}>
                  {subtitle}
                </Text>
              </View>
              <Text style={styles.badge}>PENDING</Text>
            </View>
            {responseMutation ? (
              <View style={styles.actions}>
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
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function requestTitle(request: BusinessConnection, isBusiness: boolean) {
  if (!isBusiness) return request.business?.name ?? "Business invitation";
  const user = request.role === "business" ? request.connected_user : request.creator;
  return user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : request.business?.name ?? "Connection request";
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
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
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  icon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.md,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  grow: { flex: 1 },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 14,
  },
  cardCopy: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 10,
    marginTop: 3,
  },
  badge: {
    backgroundColor: "#fff7ed",
    borderRadius: radii.full,
    color: "#c2410c",
    fontFamily: typography.fontFamilyBold,
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actions: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    paddingTop: spacing.md,
  },
});
