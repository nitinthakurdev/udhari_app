import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/types/api";
import type {
  BusinessConnection,
  BusinessSearchResult,
  ConnectionRequests,
  CustomerSearchResult,
} from "@/types/models";

export async function getBusinessConnections(businessUuid?: string) {
  const { data } = await apiClient.get<ApiSuccess<BusinessConnection[]>>(
    businessUuid
      ? `/customer-management/connected-businesses/${businessUuid}`
      : "/customer-management/list",
  );
  return data;
}

export async function getConnectedUsers(businessUuid: string) {
  const { data } = await apiClient.get<ApiSuccess<BusinessConnection[]>>(
    `/customer-management/connected-users/${businessUuid}`,
  );
  return data;
}

export async function connectBusiness(
  business: BusinessSearchResult,
  sourceBusinessUuid?: string,
) {
  const { data } = await apiClient.post<ApiSuccess<BusinessConnection>>(
    "/customer-management/create",
    {
      business_id: business.business_id,
      connect_user_id: business.connect_user_id,
      role: "customer",
      ...(sourceBusinessUuid ? { source_business_uuid: sourceBusinessUuid } : {}),
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

export async function searchCustomers(
  businessUuid: string,
  key: string,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<ApiSuccess<CustomerSearchResult[]>>(
    `/customer-management/search-users/${businessUuid}`,
    { params: { key }, signal },
  );
  return data;
}

export async function connectCustomer(businessUuid: string, userId: number) {
  const { data } = await apiClient.post<ApiSuccess<BusinessConnection>>(
    "/customer-management/connect-customer",
    { business_uuid: businessUuid, user_id: userId },
  );
  return data;
}

export async function disconnectCustomer(uuid: string) {
  const { data } = await apiClient.delete<ApiSuccess<null>>(
    `/customer-management/disconnect-customer/${uuid}`,
  );
  return data;
}

export async function getConnectionRequests() {
  const { data } = await apiClient.get<ApiSuccess<ConnectionRequests>>(
    "/customer-management/requests",
  );
  return data;
}

export async function respondToConnectionRequest(
  uuid: string,
  requestStatus: "approved" | "rejected",
) {
  const { data } = await apiClient.patch<ApiSuccess<BusinessConnection>>(
    `/customer-management/requests/${uuid}`,
    { request_status: requestStatus },
  );
  return data;
}
