import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type { Unit } from "@/types/models";

export interface UnitPayload {
  name: string;
  code: string;
  type: string;
  factor: number;
}

export async function getBusinessUnits(businessUuid: string) {
  const { data } = await apiClient.get<ApiSuccess<Unit[]>>(
    `/units/business/${businessUuid}`,
  );
  return data;
}

export async function getUnits() {
  const { data } = await apiClient.get<ApiSuccess<Unit[]>>("/units/list");
  return data;
}

export async function createUnit(payload: UnitPayload) {
  const { data } = await apiClient.post<ApiSuccess<Unit>>("/units/create", payload);
  return data;
}

export async function updateUnit(uuid: string, payload: UnitPayload) {
  const { data } = await apiClient.patch<ApiSuccess<Unit>>(`/units/update/${uuid}`, payload);
  return data;
}

export async function deleteUnit(uuid: string) {
  const { data } = await apiClient.delete<ApiSuccess<Unit>>(`/units/delete/${uuid}`);
  return data;
}
