import { stackNavigation } from "@/constants/navigationAnimations";
import { SubscriptionGuard } from "@/components/app/SubscriptionGuard";
import { RealtimeNotifications } from "@/components/app/RealtimeNotifications";
import { PushNotifications } from "@/components/app/PushNotifications";
import { useAuthStore } from "@/stores/authStore";
import {
  getMyRecurringConfigs,
  getRecurringConfigs,
} from "@/lib/api/recurring-configs";
import { secureStorage } from "@/lib/storage";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function AppLayout() {
  const isBusiness = useAuthStore(
    (state) => state.user?.user_role?.slug === "business",
  );
  const userUuid = useAuthStore((state) => state.user?.uuid);
  const activeBusiness = useAuthStore((state) => state.activeBusiness);
  const configScope = isBusiness ? activeBusiness?.uuid : userUuid;
  const configsQuery = useQuery({
    queryKey: ["recurring-configs", configScope],
    queryFn: () =>
      isBusiness
        ? getRecurringConfigs(activeBusiness?.uuid ?? "")
        : getMyRecurringConfigs(),
    enabled: Boolean(configScope),
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!configScope || !configsQuery.data) return;
    void secureStorage.setItem(
      `scheduled-configs:${configScope}`,
      JSON.stringify(configsQuery.data.data),
    );
  }, [configScope, configsQuery.data]);

  return (
    <View style={{ flex: 1 }}>
      <PushNotifications />
      <SubscriptionGuard>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{ headerShown: false, animation: stackNavigation() }}
          >
            <Stack.Protected guard={!isBusiness}>
              <Stack.Screen name="(user)" />
            </Stack.Protected>
            <Stack.Protected guard={isBusiness}>
              <Stack.Screen name="(business)" />
            </Stack.Protected>
          </Stack>
          <RealtimeNotifications />
        </View>
      </SubscriptionGuard>
    </View>
  );
}
