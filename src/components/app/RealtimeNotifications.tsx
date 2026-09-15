import { colors, radii, spacing, typography } from "@/constants/theme";
import { createRealtimeSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/authStore";
import type { RealtimeNotification } from "@/types/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useRouter, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const DISPLAY_DURATION_MS = 5_000;

export function RealtimeNotifications() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.user?.user_role?.slug);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [notification, setNotification] =
    useState<RealtimeNotification | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const socket = createRealtimeSocket(accessToken);
    const handleNotification = (nextNotification: RealtimeNotification) => {
      setNotification(nextNotification);

      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(
        () => setNotification(null),
        DISPLAY_DURATION_MS,
      );

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transitions"] }),
        queryClient.invalidateQueries({ queryKey: ["transition-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["connection-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["business-connections"] }),
        queryClient.invalidateQueries({ queryKey: ["connected-users"] }),
      ]);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
      socket.disconnect();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    };
  }, [accessToken, queryClient]);

  if (!notification) return null;

  const openNotification = () => {
    const rolePath = role === "business" ? "(business)" : "(user)";
    const tab = notification.type.startsWith("transition.")
      ? "transitions"
      : "requests";
    setNotification(null);
    router.push(`/(app)/${rolePath}/(tabs)/${tab}` as Href);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      onPress={openNotification}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <SymbolView
          name={{
            ios: "bell.fill",
            android: "notifications",
            web: "notifications",
          }}
          size={20}
          tintColor={colors.white}
        />
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>
          {notification.title}
        </Text>
        <Text numberOfLines={2} style={styles.message}>
          {notification.message}
        </Text>
      </View>
      <SymbolView
        name={{
          ios: "chevron.right",
          android: "chevron_right",
          web: "chevron_right",
        }}
        size={16}
        tintColor={colors.slate400}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 8,
    flexDirection: "row",
    gap: spacing.md,
    left: spacing.md,
    padding: spacing.md,
    position: "absolute",
    right: spacing.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    top: spacing.sm,
    zIndex: 100,
  },
  pressed: { opacity: 0.92 },
  icon: {
    alignItems: "center",
    backgroundColor: colors.brand600,
    borderRadius: radii.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  content: { flex: 1 },
  title: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
  },
  message: {
    color: colors.slate500,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});
