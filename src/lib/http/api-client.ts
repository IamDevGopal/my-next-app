import { env } from "@/config/env";
import { ApiError } from "./api-error";
import type { ApiResponse, ApiSuccessResponse } from "./api-response.type";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: FormData | unknown;
  accessToken?: string;
}

export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiSuccessResponse<TData>> {
  const isFormData = options.body instanceof FormData;
  const body: BodyInit | undefined = isFormData
    ? (options.body as FormData)
    : options.body
      ? JSON.stringify(options.body)
      : undefined;

  const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "content-type": "application/json" }),
      ...(options.accessToken
        ? { authorization: `Bearer ${options.accessToken}` }
        : {}),
      ...options.headers,
    },
    body,
  });

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error("API returned an invalid response.");
  }

  const payload = (await response.json()) as ApiResponse<TData>;

  if (!payload.success) {
    throw new ApiError(payload);
  }

  return payload;
}
