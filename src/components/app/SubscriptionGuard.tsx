import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useDailySubscriptionQuery } from "@/hooks/useDailySubscriptionQuery";
import { logout } from "@/lib/api/auth";
import { unregisterCurrentPushDevice } from "@/lib/api/push-notifications";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

export function SubscriptionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);
  const isBusiness = useAuthStore(
    (state) => state.user?.user_role?.slug === "business",
  );
  const subscriptionQuery = useDailySubscriptionQuery();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await unregisterCurrentPushDevice().catch(() => undefined);
      return logout();
    },
    onSuccess: () => {
      clearSession();
      queryClient.clear();
      router.replace("/(auth)/login");
    },
  });

  if (pathname.endsWith("/account/upgrade")) return children;
  if (subscriptionQuery.data?.data) return children;

  const error = subscriptionQuery.error ?? logoutMutation.error;
  const openUpgrade = () => {
    router.push(
      isBusiness
        ? "/(app)/(business)/account/upgrade"
        : "/(app)/(user)/account/upgrade",
    );
  };

  return (
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {subscriptionQuery.isPending ? (
            <>
              <ActivityIndicator color={colors.brand600} size="large" />
              <Text style={styles.title}>Checking your subscription</Text>
              <Text style={styles.description}>
                This will only take a moment.
              </Text>
            </>
          ) : subscriptionQuery.isError ? (
            <>
              <Text style={styles.icon}>!</Text>
              <Text style={styles.title}>Unable to check your plan</Text>
              <Text style={styles.description}>
                {getApiError(error).message}
              </Text>
              <Button
                fullWidth
                label="Try again"
                loading={subscriptionQuery.isFetching}
                onPress={() => void subscriptionQuery.refetch()}
              />
              <Button
                fullWidth
                label="Log out"
                loading={logoutMutation.isPending}
                onPress={() => logoutMutation.mutate()}
                variant="ghost"
              />
            </>
          ) : (
            <>
              <Text style={styles.icon}>♛</Text>
              <Text style={styles.title}>Upgrade required</Text>
              <Text style={styles.description}>
                Your plan has expired or no plan is active. Choose a
                subscription to continue using Udhari.
              </Text>
              <Button fullWidth label="Choose a plan" onPress={openUpgrade} />
              <Button
                fullWidth
                label="Log out"
                loading={logoutMutation.isPending}
                onPress={() => logoutMutation.mutate()}
                variant="ghost"
              />
              {logoutMutation.isError ? (
                <Text style={styles.error}>
                  {getApiError(logoutMutation.error).message}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ink, flex: 1 },
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    gap: spacing.md,
    maxWidth: 440,
    padding: spacing.xl,
    width: "100%",
  },
  icon: {
    backgroundColor: colors.brand50,
    borderRadius: 18,
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 28,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 10,
    textAlign: "center",
  },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 23,
    textAlign: "center",
  },
  description: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  error: {
    color: colors.danger600,
    fontFamily: typography.fontFamilyBold,
    fontSize: 12,
    textAlign: "center",
  },
});
