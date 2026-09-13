import { stackNavigation } from "@/constants/navigationAnimations";
import { colors, typography } from "@/constants/theme";
import { Stack } from "expo-router";

export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: stackNavigation() }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="connect-business"
        options={{
          headerBackTitle: "Requests",
          headerShown: true,
          headerShadowVisible: false,
          headerTintColor: colors.brand600,
          headerTitleStyle: { fontFamily: typography.fontFamilyBold },
          title: "Connect business",
        }}
      />
    </Stack>
  );
}
