import { useAuthStore } from "@/stores/authStore";
import { Redirect } from "expo-router";

const Index = () => {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken));
  const isBusiness = useAuthStore(
    (state) => state.user?.user_role?.slug === "business",
  );

  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;

  return (
    <Redirect
      href={isBusiness ? "/(app)/(business)/(tabs)" : "/(app)/(user)/(tabs)"}
    />
  );
};

export default Index;
