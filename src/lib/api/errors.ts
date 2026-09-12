import type { ApiErrorBody, ApiValidationDetail } from "@/types/api";
import { isAxiosError } from "axios";

export function getApiError(error: unknown) {
  if (isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;

    return {
      message:
        body?.error?.message ??
        body?.message ??
        (error.code === "ECONNABORTED"
          ? "The request timed out. Please try again."
          : error.response
            ? "Something went wrong. Please try again."
            : "Unable to reach the server. Check your connection and API URL."),
      details: body?.error?.details ?? [],
    };
  }

  return {
    message: "Something went wrong. Please try again.",
    details: [] as ApiValidationDetail[],
  };
}
