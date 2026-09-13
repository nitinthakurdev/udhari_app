import { colors, typography } from "@/constants/theme";
import { Stack } from "expo-router";

export default function ConfigurationLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Configuration",
        headerShadowVisible: false,
        headerTintColor: colors.brand600,
        headerTitleStyle: { fontFamily: typography.fontFamilyBold },
      }}
    >
      <Stack.Screen name="businesses" options={{ title: "Business management" }} />
      <Stack.Screen name="units" options={{ title: "Units" }} />
      <Stack.Screen name="connect-business" options={{ title: "Connect business" }} />
      <Stack.Screen name="connect-customer" options={{ title: "Connect customer" }} />
    </Stack>
  );
}
