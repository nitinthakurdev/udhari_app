import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { StateStorage } from "zustand/middleware";

export const secureStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === "web") {
      return typeof window === "undefined"
        ? null
        : window.localStorage.getItem(name);
    }

    return SecureStore.getItemAsync(name);
  },
  setItem: async (name, value) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined")
        window.localStorage.setItem(name, value);
      return;
    }

    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
      return;
    }

    await SecureStore.deleteItemAsync(name);
  },
};
