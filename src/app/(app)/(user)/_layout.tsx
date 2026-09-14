import { stackNavigation } from "@/constants/navigationAnimations";
import { Stack } from "expo-router";

export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: stackNavigation() }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="connect-business"
        
      />
    </Stack>
  );
}
