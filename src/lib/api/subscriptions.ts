import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type {
  PublicSubscription,
  RazorpayOrder,
  RazorpayPaymentPayload,
  RazorpayPaymentVerification,
  UserSubscription,
} from "@/types/models";

export async function getPublicSubscriptions() {
  const { data } = await apiClient.get<ApiSuccess<PublicSubscription[]>>(
    "/subscriptions/public",
  );
  return data;
}

export async function createRazorpayOrder(subscriptionUuid: string) {
  const { data } = await apiClient.post<ApiSuccess<RazorpayOrder>>(
    "/payments/razorpay/orders",
    { subscription_uuid: subscriptionUuid },
  );
  return data;
}

export async function verifyRazorpayPayment(payload: RazorpayPaymentPayload) {
  const { data } = await apiClient.post<
    ApiSuccess<RazorpayPaymentVerification>
  >("/payments/razorpay/verify", payload);
  return data;
}

export async function getCurrentUserSubscription() {
  const { data } = await apiClient.get<ApiSuccess<UserSubscription | null>>(
    "/user-subscriptions/current",
  );
  return data;
}

export async function activateFreeSubscription(subscriptionUuid: string) {
  const { data } = await apiClient.post<ApiSuccess<UserSubscription>>(
    "/user-subscriptions/free/activate",
    { subscription_uuid: subscriptionUuid },
  );
  return data;
}
