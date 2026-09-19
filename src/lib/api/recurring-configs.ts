import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type {
  RecurringConfig,
  RecurringConfigTimeRange,
  RecurringConfigType,
  RecurringConfigWeekday,
  Transition,
} from "@/types/models";

export interface CreateRecurringConfigPayload {
  business_uuid?: string;
  customer_id?: number;
  customer_business_uuid?: string;
  type: RecurringConfigType;
  name: string;
  unit_id: number | null;
  quantity: number | null;
  unit_price: number;
  week_days: RecurringConfigWeekday[];
  time_ranges: RecurringConfigTimeRange[];
}

export type UpdateRecurringConfigPayload = Omit<
  CreateRecurringConfigPayload,
  "business_uuid" | "customer_id" | "customer_business_uuid"
>;

export async function getRecurringConfigs(businessUuid: string) {
  const { data } = await apiClient.get<ApiSuccess<RecurringConfig[]>>(
    `/recurring-configs/business/${businessUuid}`,
  );
  return data;
}

export async function getMyRecurringConfigs() {
  const { data } = await apiClient.get<ApiSuccess<RecurringConfig[]>>(
    "/recurring-configs/list",
  );
  return data;
}

export async function createRecurringConfig(
  payload: CreateRecurringConfigPayload,
) {
  const { data } = await apiClient.post<ApiSuccess<RecurringConfig>>(
    "/recurring-configs/create",
    payload,
  );
  return data;
}

export async function updateRecurringConfig(
  uuid: string,
  payload: UpdateRecurringConfigPayload,
) {
  const { data } = await apiClient.patch<ApiSuccess<RecurringConfig>>(
    `/recurring-configs/update/${uuid}`,
    payload,
  );
  return data;
}

export async function deleteRecurringConfig(uuid: string) {
  const { data } = await apiClient.delete<ApiSuccess<null>>(
    `/recurring-configs/delete/${uuid}`,
  );
  return data;
}

export interface SendRecurringConfigPayload {
  type: "product" | "service";
  name: string;
  unit_id: number | null;
  quantity: number | null;
  unit_price: number;
  total_price: number;
  comment: string | null;
  occurrence_key: string;
  action: "edit" | "approved" | "rejected";
}

export async function sendRecurringConfig(
  uuid: string,
  payload: SendRecurringConfigPayload,
) {
  const { data } = await apiClient.post<ApiSuccess<Transition>>(
    `/recurring-configs/send/${uuid}`,
    payload,
  );
  return data;
}
