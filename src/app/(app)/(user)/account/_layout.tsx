import { colors, typography } from "@/constants/theme";
import { Stack } from "expo-router";

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Account",
        headerShadowVisible: false,
        headerTintColor: colors.brand600,
        headerTitleStyle: { fontFamily: typography.fontFamilyBold },
        headerShown:false
      }}
    >
      <Stack.Screen name="upgrade" options={{ title: "Upgrade plan" }} />
      <Stack.Screen name="personal-info" options={{ title: "Personal info" }} />
      <Stack.Screen name="change-password" options={{ title: "Change password" }} />
      <Stack.Screen name="privacy-policy" options={{ title: "Privacy policy" }} />
      <Stack.Screen name="help" options={{ title: "Help & support" }} />
      <Stack.Screen name="faq" options={{ title: "FAQ" }} />
    </Stack>
  );
}
