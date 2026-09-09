import { stackNavigation } from "@/constants/navigationAnimations";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaProvider style={{flex:1,paddingTop:insets.top,paddingBottom:insets.bottom}} >
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: stackNavigation() }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    </SafeAreaProvider>
  );
}
