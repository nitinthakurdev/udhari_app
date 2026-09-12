import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type { BusinessConnection, BusinessSearchResult } from "@/types/models";

export async function getBusinessConnections() {
  const { data } = await apiClient.get<ApiSuccess<BusinessConnection[]>>(
    "/customer-management/list",
  );
  return data;
}

export async function getConnectedUsers(businessUuid: string) {
  const { data } = await apiClient.get<ApiSuccess<BusinessConnection[]>>(
    `/customer-management/connected-users/${businessUuid}`,
  );
  return data;
}

export async function connectBusiness(business: BusinessSearchResult) {
  const { data } = await apiClient.post<ApiSuccess<BusinessConnection>>(
    "/customer-management/create",
    {
      business_id: business.business_id,
      connect_user_id: business.connect_user_id,
      role: "customer",
    },
  );
  return data;
}

export async function disconnectBusiness(uuid: string) {
  const { data } = await apiClient.delete<ApiSuccess<null>>(
    `/customer-management/delete/${uuid}`,
  );
  return data;
}
