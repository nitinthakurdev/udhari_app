import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type { Unit } from "@/types/models";

export async function getBusinessUnits(businessUuid: string) {
  const { data } = await apiClient.get<ApiSuccess<Unit[]>>(
    `/units/business/${businessUuid}`,
  );
  return data;
}
