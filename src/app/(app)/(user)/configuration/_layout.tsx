import { stackNavigation } from "@/constants/navigationAnimations";
import { Stack } from "expo-router";

export default function UserConfigurationLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: stackNavigation() }} />;
}
