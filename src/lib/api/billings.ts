import { apiClient } from "@/lib/api/client";
import type { ApiSuccess, PaginatedApiSuccess } from "@/types/api";
import type { Billing } from "@/types/models";

export interface BillingFilters {
  year?: number;
  month?: number;
}

export async function getBillings(businessUuid?: string, filters: BillingFilters = {}) {
  const { data } = await apiClient.get<PaginatedApiSuccess<Billing>>(
    businessUuid ? `/billings/business/${businessUuid}` : "/billings/list",
    { params: filters },
  );
  return data;
}

export async function recordBillingPayment(uuid: string, amount: number) {
  const { data } = await apiClient.post<ApiSuccess<Billing>>(`/billings/payments/${uuid}`, {
    amount,
  });
  return data;
}

export async function generateBilling(uuid: string, dueDate: string) {
  const { data } = await apiClient.patch<ApiSuccess<Billing>>(`/billings/generate/${uuid}`, {
    due_date: dueDate,
  });
  return data;
}

export async function extendBillingDueDate(uuid: string, extendDueDate: string) {
  const { data } = await apiClient.patch<ApiSuccess<Billing>>(`/billings/due-date/${uuid}`, {
    extend_due_date: extendDueDate,
  });
  return data;
}
