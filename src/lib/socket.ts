import { apiClient } from "@/lib/api/client";
import type { RealtimeNotification } from "@/types/notifications";
import { io, type Socket } from "socket.io-client";

interface ServerToClientEvents {
  notification: (notification: RealtimeNotification) => void;
}

interface ClientToServerEvents {
  "notification:ack": (notificationId: string) => void;
}

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function getSocketUrl() {
  const apiUrl = String(apiClient.defaults.baseURL ?? "");
  return (
    process.env.EXPO_PUBLIC_SOCKET_URL ??
    apiUrl.replace(/\/api\/v1\/?$/, "")
  );
}

export function createRealtimeSocket(accessToken: string): RealtimeSocket {
  const socket: RealtimeSocket = io(getSocketUrl(), {
    auth: { token: accessToken },
    reconnection: true,
  });
  return socket;
}
