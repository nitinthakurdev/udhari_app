import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { StateStorage } from "zustand/middleware";

const secureStoreKey = (name: string) => {
  const normalized = name.replace(/[^A-Za-z0-9._-]/g, "_");
  return normalized || "storage_key";
};

export const secureStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === "web") {
      return typeof window === "undefined"
        ? null
        : window.localStorage.getItem(name);
    }

    return SecureStore.getItemAsync(secureStoreKey(name));
  },
  setItem: async (name, value) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined")
        window.localStorage.setItem(name, value);
      return;
    }

    await SecureStore.setItemAsync(secureStoreKey(name), value);
  },
  removeItem: async (name) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
      return;
    }

    await SecureStore.deleteItemAsync(secureStoreKey(name));
  },
};
