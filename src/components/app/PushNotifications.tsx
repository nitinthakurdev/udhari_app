import { registerPushDevice } from "@/lib/api/push-notifications";
import { getNotificationHref } from "@/lib/notificationNavigation";
import { useAuthStore } from "@/stores/authStore";
import type { NotificationType } from "@/types/notifications";
import { useQueryClient } from "@tanstack/react-query";
import Constants, { AppOwnership } from "expo-constants";
import * as Device from "expo-device";
import type { NotificationResponse } from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";

const notificationTypes = new Set<NotificationType>([
  "connection.requested",
  "connection.responded",
  "transition.created",
  "transition.updated",
  "transition.cancelled",
  "transition.payment_received",
  "billing.payment_received",
]);

const isNotificationType = (value: unknown): value is NotificationType =>
  typeof value === "string" && notificationTypes.has(value as NotificationType);

type NotificationsModule = typeof import("expo-notifications");

let notificationHandlerConfigured = false;

async function loadNotifications(): Promise<NotificationsModule> {
  const notifications = await import("expo-notifications");
  if (!notificationHandlerConfigured) {
    configureNotificationHandler(notifications);
    notificationHandlerConfigured = true;
  }
  return notifications;
}

function configureNotificationHandler(notifications: NotificationsModule) {
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function getProjectId() {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (typeof projectId !== "string" || !projectId) {
    throw new Error("EAS project ID is missing from the app configuration.");
  }

  return projectId;
}

async function getExpoPushToken(notifications: NotificationsModule) {
  if (Platform.OS === "web" || !Device.isDevice) return null;

  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("udhari-updates", {
      name: "Udhari updates",
      description: "Connection, transition, billing, and payment updates",
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#155EEF",
      sound: "default",
    });
  }

  const existingPermission = await notifications.getPermissionsAsync();
  const permission =
    existingPermission.status === "granted"
      ? existingPermission
      : await notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;

  return (
    await notifications.getExpoPushTokenAsync({ projectId: getProjectId() })
  ).data;
}

export function PushNotifications() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.user?.user_role?.slug);
  const queryClient = useQueryClient();
  const router = useRouter();

  const refreshNotificationData = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transitions"] }),
      queryClient.invalidateQueries({ queryKey: ["transition-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["connection-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["business-connections"] }),
      queryClient.invalidateQueries({ queryKey: ["connected-users"] }),
      queryClient.invalidateQueries({ queryKey: ["billings"] }),
      queryClient.invalidateQueries({ queryKey: ["recurring-configs"] }),
    ]);
  }, [queryClient]);

  const openNotification = useCallback(
    (response: NotificationResponse) => {
      const type = response.notification.request.content.data?.["type"];
      if (!isNotificationType(type)) return;

      refreshNotificationData();
      router.push(getNotificationHref(type, role));
      void loadNotifications().then((notifications) =>
        notifications.clearLastNotificationResponseAsync(),
      );
    },
    [refreshNotificationData, role, router],
  );

  useEffect(() => {
    if (!accessToken || Constants.appOwnership === AppOwnership.Expo) return;

    let active = true;
    let pushTokenSubscription: { remove: () => void } | undefined;
    void loadNotifications()
      .then(async (notifications) => {
        const expoPushToken = await getExpoPushToken(notifications);
        if (
          !active ||
          !expoPushToken ||
          (Platform.OS !== "android" && Platform.OS !== "ios")
        ) {
          return;
        }
        await registerPushDevice({
          expo_push_token: expoPushToken,
          platform: Platform.OS,
          device_name: Device.deviceName,
        });

        pushTokenSubscription = notifications.addPushTokenListener(
          (devicePushToken) => {
            void notifications
              .getExpoPushTokenAsync({
                projectId: getProjectId(),
                devicePushToken,
              })
              .then(({ data }) =>
                registerPushDevice({
                  expo_push_token: data,
                  platform: Platform.OS as "android" | "ios",
                  device_name: Device.deviceName,
                }),
              )
              .catch((error: unknown) => {
                console.warn("Push token refresh failed", error);
              });
          },
        );
      })
      .catch((error: unknown) => {
        console.warn("Push notification registration failed", error);
      });

    return () => {
      active = false;
      pushTokenSubscription?.remove();
    };
  }, [accessToken]);

  useEffect(() => {
    if (Constants.appOwnership === AppOwnership.Expo) return;

    let active = true;
    let receivedSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;

    void loadNotifications().then((notifications) => {
      if (!active) return;
      receivedSubscription = notifications.addNotificationReceivedListener(
        () => {
          refreshNotificationData();
        },
      );
      responseSubscription =
        notifications.addNotificationResponseReceivedListener(openNotification);

      void notifications.getLastNotificationResponseAsync().then((response) => {
        if (active && response) openNotification(response);
      });
    });

    return () => {
      active = false;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [openNotification, refreshNotificationData]);

  return null;
}
