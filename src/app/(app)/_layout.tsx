import { stackNavigation } from "@/constants/navigationAnimations";
import { SubscriptionGuard } from "@/components/app/SubscriptionGuard";
import { RealtimeNotifications } from "@/components/app/RealtimeNotifications";
import { useAuthStore } from "@/stores/authStore";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function AppLayout() {
  const isBusiness = useAuthStore(
    (state) => state.user?.user_role?.slug === "business",
  );

  return (
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
  );
}
