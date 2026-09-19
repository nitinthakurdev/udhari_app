import Page from "@/components/app/Page";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/States";
import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  getConnectionRequests,
  respondToConnectionRequest,
} from "@/lib/api/connections";
import { getApiError } from "@/lib/api/errors";
import {
  getBusinessTransitions,
  getTransitions,
  updateTransition,
} from "@/lib/api/transitions";
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
  const currentUserUuid = useAuthStore((state) => state.user?.uuid);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const requestsQuery = useQuery({
    queryKey: ["connection-requests"],
    queryFn: getConnectionRequests,
  });
  const transitionRequestsQuery = useQuery({
    queryKey: [
      "transition-requests",
      isBusiness ? activeBusiness?.uuid : "user",
    ],
    queryFn: () =>
      isBusiness
        ? getBusinessTransitions(activeBusiness?.uuid ?? "", {
            view: "pending",
          })
        : getTransitions({ view: "pending" }),
    enabled: !isBusiness || Boolean(activeBusiness?.uuid),
  });
  const transitionApprovalMutation = useMutation({
    mutationFn: ({
      uuid,
      status,
    }: {
      uuid: string;
      status: "approved" | "rejected";
    }) => updateTransition(uuid, { request_status: status }),
    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transition-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["transitions"] }),
        queryClient.invalidateQueries({ queryKey: ["transition-summary"] }),
      ]);
      Alert.alert(
        variables.status === "approved" ? "Accepted" : "Rejected",
        `Transition ${variables.status === "approved" ? "accepted" : "rejected"} successfully.`,
      );
    },
    onError: (error) =>
      Alert.alert("Could not approve transition", getApiError(error).message),
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
        queryClient.invalidateQueries({
          queryKey: ["direct-user-connections"],
        }),
      ]);
      Alert.alert(
        "Request updated",
        response.message ?? "Connection request updated.",
      );
    },
    onError: (error) =>
      Alert.alert("Could not update request", getApiError(error).message),
  });
  const incoming = requestsQuery.data?.data.incoming ?? [];
  const outgoing = requestsQuery.data?.data.outgoing ?? [];
  const transitionRequests = transitionRequestsQuery.data?.data ?? [];

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
      ) : incoming.length === 0 &&
        outgoing.length === 0 &&
        transitionRequests.length === 0 ? (
        <EmptyState
          title="No pending requests"
          message="New connection invitations will appear here."
        />
      ) : (
        <>
          {transitionRequests.length > 0 ? (
            <View style={styles.section}>
              <View>
                <Text style={styles.sectionTitle}>Transition approvals</Text>
                <Text style={styles.sectionCopy}>
                  {transitionRequests.length} waiting for you
                </Text>
              </View>
              {transitionRequests.map((transition) => (
                <View style={styles.card} key={transition.uuid}>
                  <View style={styles.row}>
                    <View style={styles.grow}>
                      <Text style={styles.cardTitle}>
                        {transition.product_name}
                      </Text>
                      <Text style={styles.cardCopy}>
                        ₹{transition.total_price.toFixed(2)}
                        {transition.recurring_config_id
                          ? " · Scheduled configuration"
                          : ""}
                      </Text>
                    </View>
                    <Text style={styles.badge}>PENDING</Text>
                  </View>
                  <View style={styles.actions}>
                    <Button
                      label="Reject"
                      size="sm"
                      variant="danger"
                      disabled={transitionApprovalMutation.isPending}
                      onPress={() =>
                        transitionApprovalMutation.mutate({
                          uuid: transition.uuid,
                          status: "rejected",
                        })
                      }
                    />
                    <Button
                      label="Accept"
                      size="sm"
                      loading={
                        transitionApprovalMutation.isPending &&
                        transitionApprovalMutation.variables?.uuid ===
                          transition.uuid &&
                        transitionApprovalMutation.variables.status ===
                          "approved"
                      }
                      disabled={transitionApprovalMutation.isPending}
                      onPress={() =>
                        transitionApprovalMutation.mutate({
                          uuid: transition.uuid,
                          status: "approved",
                        })
                      }
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <RequestSection
            title="Incoming"
            requests={incoming}
            isBusiness={isBusiness}
            currentUserUuid={currentUserUuid}
            responseMutation={responseMutation}
          />
          <RequestSection
            title="Sent"
            requests={outgoing}
            isBusiness={isBusiness}
            currentUserUuid={currentUserUuid}
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
  currentUserUuid,
  responseMutation,
}: {
  title: string;
  requests: BusinessConnection[];
  isBusiness: boolean;
  currentUserUuid?: string;
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
        const titleText = requestTitle(request, isBusiness, currentUserUuid);
        const subtitle = request.business?.name
          ? `Business: ${request.business.name}`
          : request.role === "user"
            ? "User connection"
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
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function requestTitle(
  request: BusinessConnection,
  isBusiness: boolean,
  currentUserUuid?: string,
) {
  if (request.role === "user") {
    const user =
      request.connected_user?.uuid === currentUserUuid
        ? request.creator
        : request.connected_user;
    return user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ")
      : "User connection";
  }
  if (!isBusiness) return request.business?.name ?? "Business invitation";
  const user =
    request.role === "business" ? request.connected_user : request.creator;
  return user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : (request.business?.name ?? "Connection request");
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
