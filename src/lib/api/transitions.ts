import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type {
  Transition,
  TransitionCreatePayload,
  TransitionUpdatePayload,
} from "@/types/models";

export async function getTransitions() {
  const { data } =
    await apiClient.get<ApiSuccess<Transition[]>>("/transitions/list");
  return data;
}

export async function getBusinessTransitions(businessUuid: string) {
  const { data } = await apiClient.get<ApiSuccess<Transition[]>>(
    `/transitions/business/${businessUuid}`,
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

export async function deleteTransition(uuid: string) {
  const { data } = await apiClient.delete<ApiSuccess<null>>(
    `/transitions/delete/${uuid}`,
  );
  return data;
}
