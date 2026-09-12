import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type {
  Business,
  BusinessPayload,
  BusinessSearchResult,
} from "@/types/models";

export async function getBusinesses() {
  const { data } =
    await apiClient.get<ApiSuccess<Business[]>>("/business/list");
  return data;
}

export async function createBusiness(payload: BusinessPayload) {
  const { data } = await apiClient.post<ApiSuccess<Business>>(
    "/business/create",
    payload,
  );
  return data;
}

export async function updateBusiness(
  uuid: string,
  payload: Partial<BusinessPayload>,
) {
  const { data } = await apiClient.patch<ApiSuccess<Business>>(
    `/business/update/${uuid}`,
    payload,
  );
  return data;
}

export async function deleteBusiness(uuid: string) {
  const { data } = await apiClient.delete<ApiSuccess<null>>(
    `/business/delete/${uuid}`,
  );
  return data;
}

export async function setDefaultBusiness(uuid: string) {
  const { data } = await apiClient.patch<ApiSuccess<Business>>(
    `/business/set-default/${uuid}`,
  );
  return data;
}

export async function searchBusinesses(key: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiSuccess<BusinessSearchResult[]>>(
    "/business/search",
    {
      params: { key },
      signal,
    },
  );
  return data;
}
