import { useAuthStore } from "@/stores/authStore";
import { create as createAxios, isAxiosError } from "axios";
import { Platform } from "react-native";

const developmentApiUrl = Platform.select({
  android: "http://192.168.1.18:5001/api/v1",
  default: "http://192.168.1.18:5001/api/v1",
});

export const apiClient = createAxios({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? developmentApiUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }

    return Promise.reject(
      error instanceof Error ? error : new Error("Request failed"),
    );
  },
);
