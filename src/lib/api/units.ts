import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type { Unit } from "@/types/models";

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

export async function createUnit(name: string) {
  const { data } = await apiClient.post<ApiSuccess<Unit>>("/units/create", { name });
  return data;
}

export async function updateUnit(uuid: string, name: string) {
  const { data } = await apiClient.patch<ApiSuccess<Unit>>(`/units/update/${uuid}`, { name });
  return data;
}

export async function deleteUnit(uuid: string) {
  const { data } = await apiClient.delete<ApiSuccess<Unit>>(`/units/delete/${uuid}`);
  return data;
}
