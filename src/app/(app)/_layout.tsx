import { stackNavigation } from "@/constants/navigationAnimations";
import { useAuthStore } from "@/stores/authStore";
import { Stack } from "expo-router";

export default function AppLayout() {
  const isBusiness = useAuthStore(
    (state) => state.user?.user_role?.slug === "business",
  );

  return (
    <Stack screenOptions={{ headerShown: false, animation: stackNavigation() }}>
      <Stack.Protected guard={!isBusiness}>
        <Stack.Screen name="(user)" />
      </Stack.Protected>
      <Stack.Protected guard={isBusiness}>
        <Stack.Screen name="(business)" />
      </Stack.Protected>
    </Stack>
  );
}
