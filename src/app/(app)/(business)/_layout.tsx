import { stackNavigation } from "@/constants/navigationAnimations";
import { Stack } from "expo-router";

export default function BusinessLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: stackNavigation() }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scheduled-transitions" />
    </Stack>
  );
}
