import { secureStorage } from "@/lib/storage";
import type { ApiSuccess } from "@/types/api";
import type {
  AuthSession,
  Business,
  CurrentUser,
  UserSubscription,
} from "@/types/models";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeBusiness: Business | null;
  subscriptionCheck: {
    userUuid: string;
    checkedAt: number;
    response: ApiSuccess<UserSubscription | null>;
  } | null;
  hasHydrated: boolean;
  setSession: (session: AuthSession) => void;
  setUser: (user: CurrentUser) => void;
  setActiveBusiness: (business: Business | null) => void;
  setSubscriptionCheck: (
    userUuid: string,
    response: ApiSuccess<UserSubscription | null>,
  ) => void;
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
      subscriptionCheck: null,
      hasHydrated: false,
      setSession: (session) =>
        set((state) => ({
          user: session.user,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          activeBusiness: session.user.business ?? null,
          subscriptionCheck:
            state.subscriptionCheck?.userUuid === session.user.uuid
              ? state.subscriptionCheck
              : null,
        })),
      setUser: (user) =>
        set((state) => ({
          user,
          activeBusiness: state.activeBusiness ?? user.business ?? null,
        })),
      setActiveBusiness: (activeBusiness) => set({ activeBusiness }),
      setSubscriptionCheck: (userUuid, response) =>
        set({ subscriptionCheck: { userUuid, checkedAt: Date.now(), response } }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeBusiness: null,
          subscriptionCheck: null,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "udhari-auth",
      storage: createJSONStorage(() => secureStorage),
      partialize: ({
        user,
        accessToken,
        refreshToken,
        activeBusiness,
        subscriptionCheck,
      }) => ({
        user,
        accessToken,
        refreshToken,
        activeBusiness,
        subscriptionCheck,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
