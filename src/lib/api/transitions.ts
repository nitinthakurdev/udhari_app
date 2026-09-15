import { apiClient } from "@/lib/api/client";
import type { ApiSuccess, PaginatedApiSuccess } from "@/types/api";
import type {
  Transition,
  TransitionBatchCreatePayload,
  TransitionBalanceSummary,
  TransitionCreatePayload,
  TransitionListParams,
  TransitionUpdatePayload,
} from "@/types/models";

export async function getTransitions(params: TransitionListParams = {}) {
  const { data } = await apiClient.get<PaginatedApiSuccess<Transition>>(
    "/transitions/list",
    { params },
  );
  return data;
}

export async function getBusinessTransitions(
  businessUuid: string,
  params: TransitionListParams = {},
) {
  const { data } = await apiClient.get<PaginatedApiSuccess<Transition>>(
    `/transitions/business/${businessUuid}`,
    { params },
  );
  return data;
}

export async function getTransitionSummary(businessUuid?: string) {
  const { data } = await apiClient.get<ApiSuccess<TransitionBalanceSummary>>(
    businessUuid
      ? `/transitions/business/${businessUuid}/summary`
      : "/transitions/summary",
  );
  return data;
}

export async function createTransition(payload: TransitionCreatePayload) {
  const { data } = await apiClient.post<ApiSuccess<Transition>>(
    "/transitions/create",
    payload,
  );
  return data;
}

export async function createTransitions(payload: TransitionBatchCreatePayload) {
  const { data } = await apiClient.post<ApiSuccess<Transition[]>>(
    "/transitions/create-batch",
    payload,
  );
  return data;
}

export async function updateTransition(
  uuid: string,
  payload: TransitionUpdatePayload,
) {
  const { data } = await apiClient.patch<ApiSuccess<Transition>>(
    `/transitions/update/${uuid}`,
    payload,
  );
  return data;
}

export async function cancelTransition(uuid: string) {
  const { data } = await apiClient.patch<ApiSuccess<Transition>>(
    `/transitions/cancel/${uuid}`,
  );
  return data;
}
