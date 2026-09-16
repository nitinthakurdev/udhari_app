import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";

export type PushPlatform = "android" | "ios";

let currentExpoPushToken: string | null = null;

export async function registerPushDevice(payload: {
  expo_push_token: string;
  platform: PushPlatform;
  device_name?: string | null;
}) {
  const { data } = await apiClient.post<ApiSuccess<{ uuid: string }>>(
    "/users/push-token",
    payload,
  );
  currentExpoPushToken = payload.expo_push_token;
  return data;
}

export async function unregisterCurrentPushDevice() {
  if (!currentExpoPushToken) return;

  const token = currentExpoPushToken;
  currentExpoPushToken = null;
  await apiClient.delete<ApiSuccess<null>>("/users/push-token", {
    data: { expo_push_token: token },
  });
}
