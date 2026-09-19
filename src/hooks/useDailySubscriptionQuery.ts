import { getCurrentUserSubscription } from "@/lib/api/subscriptions";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const SUBSCRIPTION_CHECK_INTERVAL = 24 * 60 * 60 * 1_000;

export function useDailySubscriptionQuery() {
  const [mountedAt] = useState(() => Date.now());
  const userUuid = useAuthStore((state) => state.user?.uuid);
  const subscriptionCheck = useAuthStore((state) => state.subscriptionCheck);
  const setSubscriptionCheck = useAuthStore(
    (state) => state.setSubscriptionCheck,
  );
  const hasFreshCheck = Boolean(
    userUuid &&
      subscriptionCheck?.userUuid === userUuid &&
      mountedAt - subscriptionCheck.checkedAt < SUBSCRIPTION_CHECK_INTERVAL,
  );

  return useQuery({
    queryKey: ["user-subscriptions", "current", userUuid],
    queryFn: async () => {
      const response = await getCurrentUserSubscription();
      if (userUuid) setSubscriptionCheck(userUuid, response);
      return response;
    },
    enabled: Boolean(userUuid) && !hasFreshCheck,
    initialData: hasFreshCheck ? subscriptionCheck?.response : undefined,
    initialDataUpdatedAt: hasFreshCheck
      ? subscriptionCheck?.checkedAt
      : undefined,
    staleTime: SUBSCRIPTION_CHECK_INTERVAL,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
