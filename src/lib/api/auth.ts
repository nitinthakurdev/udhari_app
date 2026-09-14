import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type { AuthSession, CurrentUser, PublicUser } from "@/types/models";

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string | null;
  email: string;
  username: string;
  phone: string;
  dial_code: string | null;
  password: string;
  role_slug: "user" | "business";
}

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<ApiSuccess<AuthSession>>(
    "/users/sign-in",
    payload,
  );
  const currentUser = await getCurrentUser(data.data.access_token);

  return {
    ...data,
    data: { ...data.data, user: currentUser.data },
  };
}

export async function getCurrentUser(accessToken?: string) {
  const { data } = await apiClient.get<ApiSuccess<CurrentUser>>(
    "/users/current-user",
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );

  return data;
}

export async function registerUser(payload: RegisterPayload) {
  const { data } = await apiClient.post<ApiSuccess<PublicUser>>(
    "/users/sign-up",
    payload,
  );
  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post<ApiSuccess<null>>(
    "/users/forgot-password",
    { email },
  );
  return data;
}

export async function verifyEmail(token: string) {
  const { data } = await apiClient.get<ApiSuccess<AuthSession>>(
    "/users/verify-email",
    {
      params: { token },
    },
  );
  return data;
}

export async function resendVerification(email: string) {
  const { data } = await apiClient.post<ApiSuccess<null>>(
    "/users/resend-verification",
    {
      email,
    },
  );
  return data;
}

export async function resetPassword(token: string, password: string) {
  const { data } = await apiClient.post<ApiSuccess<null>>(
    "/users/reset-password",
    {
      token,
      password,
    },
  );
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const { data } = await apiClient.patch<ApiSuccess<null>>(
    "/users/change-password",
    {
      current_password: currentPassword,
      new_password: newPassword,
    },
  );
  return data;
}

export async function logout() {
  const { data } = await apiClient.post<ApiSuccess<null>>("/users/logout");
  return data;
}
