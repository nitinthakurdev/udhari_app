import { secureStorage } from "@/lib/storage";
import type { AuthSession, Business, CurrentUser } from "@/types/models";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeBusiness: Business | null;
  hasHydrated: boolean;
  setSession: (session: AuthSession) => void;
  setUser: (user: CurrentUser) => void;
  setActiveBusiness: (business: Business | null) => void;
  clearSession: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeBusiness: null,
      hasHydrated: false,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          activeBusiness: session.user.business ?? null,
        }),
      setUser: (user) =>
        set((state) => ({
          user,
          activeBusiness: state.activeBusiness ?? user.business ?? null,
        })),
      setActiveBusiness: (activeBusiness) => set({ activeBusiness }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeBusiness: null,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "udhari-auth",
      storage: createJSONStorage(() => secureStorage),
      partialize: ({ user, accessToken, refreshToken, activeBusiness }) => ({
        user,
        accessToken,
        refreshToken,
        activeBusiness,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
