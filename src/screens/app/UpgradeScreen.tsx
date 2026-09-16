import Page from "@/components/app/Page";
import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getApiError } from "@/lib/api/errors";
import {
  activateFreeSubscription,
  createRazorpayOrder,
  getCurrentUserSubscription,
  getPublicSubscriptions,
  verifyRazorpayPayment,
} from "@/lib/api/subscriptions";
import { useAuthStore } from "@/stores/authStore";
import type { PublicSubscription, SubscriptionConfig } from "@/types/models";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function UpgradeScreen({
  razorpayAvailable,
}: {
  razorpayAvailable: boolean;
}) {
  const [checkoutMessage, setCheckoutMessage] = useState<string>();
  const user = useAuthStore((state) => state.user);
  const roleSlug = useAuthStore((state) => state.user?.user_role?.slug);
  const plansQuery = useQuery({
    queryKey: ["subscriptions", "public"],
    queryFn: getPublicSubscriptions,
  });
  const currentQuery = useQuery({
    queryKey: ["user-subscriptions", "current"],
    queryFn: getCurrentUserSubscription,
  });
  const freeMutation = useMutation({
    mutationFn: activateFreeSubscription,
    onSuccess: async () => {
      setCheckoutMessage("Your free subscription is now active.");
      await currentQuery.refetch();
    },
  });
  const createRazorpayOrderMutation = useMutation({
    mutationFn: createRazorpayOrder,
  });
  const verifyRazorpayPaymentMutation = useMutation({
    mutationFn: verifyRazorpayPayment,
  });
  const current = currentQuery.data?.data;
  const plans = (plansQuery.data?.data ?? []).filter(
    (plan) => plan.role.slug === roleSlug,
  );
  const startRazorpayPurchase = async (plan: PublicSubscription) => {
    if (!razorpayAvailable) {
      setCheckoutMessage(
        "Razorpay Checkout requires a configured native development or store build.",
      );
      return;
    }

    setCheckoutMessage(undefined);
    try {
      const [{ default: RazorpayCheckout }, orderResponse] = await Promise.all([
        import("react-native-razorpay"),
        createRazorpayOrderMutation.mutateAsync(plan.uuid),
      ]);
      const key =
        orderResponse.data.key_id ??
        process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID?.trim();
      if (!key) {
        throw new Error(
          "Razorpay public key is missing from both the API response and this app build.",
        );
      }
      const payment = await RazorpayCheckout.open({
        key,
        amount: String(orderResponse.data.amount),
        currency: orderResponse.data.currency,
        name: "Udhari",
        description: `${plan.name} subscription`,
        order_id: orderResponse.data.order_id,
        prefill: {
          email: user?.email,
          contact: `${user?.dial_code ?? ""}${user?.phone ?? ""}`,
          name: [user?.first_name, user?.last_name].filter(Boolean).join(" "),
        },
        theme: { color: colors.brand600 },
      });
      await verifyRazorpayPaymentMutation.mutateAsync(payment);
      setCheckoutMessage("Payment verified. Your subscription is now active.");
      await currentQuery.refetch();
    } catch (error) {
      const checkoutError = error as {
        code?: number | string;
        description?: string;
      };
      setCheckoutMessage(
        checkoutError.description ??
          (checkoutError.code === 0 || checkoutError.code === "0"
            ? "Checkout was cancelled. You were not charged."
            : getApiError(error).message),
      );
    }
  };

  const error = plansQuery.error ?? currentQuery.error;
  const refreshing = plansQuery.isRefetching || currentQuery.isRefetching;

  const refresh = () => {
    void Promise.all([plansQuery.refetch(), currentQuery.refetch()]);
  };

  return (
    <Page
      backTitle="Account"
      eyebrow="SUBSCRIPTION"
      title="Upgrade your plan"
      subtitle="Compare usage limits and choose the right plan for your account."
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {!razorpayAvailable ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Paid plans need a native build containing Razorpay Checkout. Free
            plans remain available in this build.
          </Text>
        </View>
      ) : null}

      {checkoutMessage ? (
        <View style={styles.successCard}>
          <Text style={styles.successText}>{checkoutMessage}</Text>
        </View>
      ) : null}

      {current ? (
        <View style={styles.currentCard}>
          <View style={styles.currentHeading}>
            <SymbolView
              name={{
                ios: "crown.fill",
                android: "workspace_premium",
                web: "workspace_premium",
              }}
              size={21}
              tintColor={colors.white}
            />
            <Text style={styles.currentEyebrow}>CURRENT PLAN</Text>
          </View>
          <Text style={styles.currentName}>{current.subscription.name}</Text>
          <Text style={styles.currentDescription}>
            {current.subscription.description}
          </Text>
          <View style={styles.expiryBadge}>
            <Text style={styles.expiryLabel}>ACTIVE UNTIL</Text>
            <Text style={styles.expiryValue}>
              {formatDate(current.expiry_at)}
            </Text>
            <Text style={styles.renewalValue}>
              {current.auto_renew ? "AUTO-RENEWAL ON" : "AUTO-RENEWAL OFF"}
            </Text>
          </View>
        </View>
      ) : null}

      {plansQuery.isPending || currentQuery.isPending ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>Loading subscription plans…</Text>
        </View>
      ) : error ? (
        <View style={[styles.messageCard, styles.errorCard]}>
          <Text style={styles.errorText}>{getApiError(error).message}</Text>
          <Button
            label="Try again"
            size="sm"
            variant="outline"
            onPress={refresh}
          />
        </View>
      ) : plans.length ? (
        <View style={styles.planList}>
          {freeMutation.isError ? (
            <View style={[styles.messageCard, styles.errorCard]}>
              <Text style={styles.errorText}>
                {getApiError(freeMutation.error).message}
              </Text>
            </View>
          ) : null}
          {plans.map((plan) => (
            <PlanCard
              checkoutPending={
                freeMutation.isPending ||
                createRazorpayOrderMutation.isPending ||
                verifyRazorpayPaymentMutation.isPending
              }
              currentUuid={current?.subscription.uuid}
              key={plan.uuid}
              onCheckout={() => {
                if (plan.price === 0) {
                  freeMutation.mutate(plan.uuid);
                } else {
                  void startRazorpayPurchase(plan);
                }
              }}
              plan={plan}
              razorpayAvailable={razorpayAvailable}
            />
          ))}
        </View>
      ) : (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>
            No upgrade plans are currently available for your account type.
          </Text>
        </View>
      )}
    </Page>
  );
}

function PlanCard({
  checkoutPending,
  currentUuid,
  onCheckout,
  plan,
  razorpayAvailable,
}: {
  checkoutPending: boolean;
  currentUuid?: string;
  onCheckout: () => void;
  plan: PublicSubscription;
  razorpayAvailable: boolean;
}) {
  const isCurrent = currentUuid === plan.uuid;
  const limits = formatLimits(plan.config);

  return (
    <View style={[styles.planCard, isCurrent && styles.currentPlanCard]}>
      <View style={styles.planHeading}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{plan.role.name.toUpperCase()}</Text>
        </View>
        {isCurrent ? <Text style={styles.currentLabel}>CURRENT</Text> : null}
      </View>
      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.planDescription}>{plan.description}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(plan)}</Text>
        <Text style={styles.period}>{formatPeriod(plan)}</Text>
      </View>
      <View style={styles.featureList}>
        {[...limits, ...plan.features].map((item, index) => (
          <View style={styles.featureRow} key={`${index}-${item}`}>
            <View style={styles.checkIcon}>
              <SymbolView
                name={{ ios: "checkmark", android: "check", web: "check" }}
                size={12}
                tintColor={colors.brand600}
              />
            </View>
            <Text style={styles.featureText}>{item}</Text>
          </View>
        ))}
      </View>
      <Button
        fullWidth
        disabled={
          isCurrent || (plan.price > 0 && !razorpayAvailable)
        }
        loading={!isCurrent && checkoutPending}
        label={
          isCurrent
            ? "Current plan"
            : plan.price === 0
              ? "Activate free plan"
              : razorpayAvailable
                ? "Pay with Razorpay"
                : "Native build required"
        }
        onPress={onCheckout}
      />
    </View>
  );
}

function formatLimits(config: SubscriptionConfig) {
  return [
    formatLimit(config.allowed_transitions, "transition"),
    formatLimit(config.allowed_connected_customers, "connected customer"),
    formatLimit(
      config.allowed_connected_businesses,
      "connected business",
      "connected businesses",
    ),
    formatLimit(config.allowed_connected_users, "connected user"),
    formatLimit(
      config.allowed_managed_businesses,
      "managed business",
      "managed businesses",
    ),
  ];
}

function formatLimit(value: number, singular: string, plural = `${singular}s`) {
  return value === 0
    ? `Unlimited ${plural}`
    : `${value.toLocaleString("en-IN")} ${value === 1 ? singular : plural}`;
}

function formatPrice(plan: PublicSubscription) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: plan.currency,
      maximumFractionDigits: 0,
    }).format(plan.price);
  } catch {
    return `${plan.currency} ${plan.price}`;
  }
}

function formatPeriod(plan: PublicSubscription) {
  const units = {
    MONTHLY: "month",
    QUARTERLY: "quarter",
    YEARLY: "year",
  } as const;
  const unit = units[plan.duration_type];
  if (plan.price === 0 && plan.auto_renewal_enabled) {
    return plan.duration === 1
      ? `auto-renews each ${unit}`
      : `auto-renews every ${plan.duration} ${unit}s`;
  }
  if (plan.price === 0) {
    return plan.duration === 1
      ? `for 1 ${unit}`
      : `for ${plan.duration} ${unit}s`;
  }
  return plan.duration === 1
    ? `per ${unit}`
    : `every ${plan.duration} ${unit}s`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  noticeText: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 12,
    lineHeight: 18,
  },
  currentCard: {
    backgroundColor: colors.ink,
    borderRadius: 22,
    elevation: 4,
    padding: spacing.xl,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  currentHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  currentEyebrow: {
    color: colors.brand200,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  currentName: {
    color: colors.white,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 24,
    marginTop: spacing.md,
  },
  currentDescription: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  expiryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,.1)",
    borderRadius: radii.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  expiryLabel: {
    color: colors.slate400,
    fontFamily: typography.fontFamilyBold,
    fontSize: 8,
  },
  expiryValue: {
    color: colors.white,
    fontFamily: typography.fontFamilyBold,
    fontSize: 12,
    marginTop: 3,
  },
  renewalValue: {
    color: colors.brand200,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 8,
    marginTop: 5,
  },
  planList: { gap: spacing.lg },
  planCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    padding: spacing.xl,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  currentPlanCard: { borderColor: colors.brand400, borderWidth: 2 },
  planHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roleBadge: {
    backgroundColor: colors.brand50,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleText: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 9,
  },
  currentLabel: {
    color: colors.brand600,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 9,
  },
  planName: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 21,
    marginTop: spacing.lg,
  },
  planDescription: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  priceRow: {
    alignItems: "flex-end",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  price: {
    color: colors.ink,
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 28,
  },
  period: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    paddingBottom: 4,
  },
  featureList: { gap: spacing.md, paddingVertical: spacing.lg },
  featureRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  checkIcon: {
    alignItems: "center",
    backgroundColor: colors.brand50,
    borderRadius: radii.full,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  featureText: {
    color: colors.slate700,
    flex: 1,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  messageCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  messageText: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 13,
    textAlign: "center",
  },
  errorCard: { borderColor: colors.danger600 },
  errorText: {
    color: colors.danger600,
    fontFamily: typography.fontFamilyMedium,
    fontSize: 13,
    textAlign: "center",
  },
  successCard: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  successText: {
    color: colors.brand700,
    fontFamily: typography.fontFamilyBold,
    fontSize: 12,
  },
});
