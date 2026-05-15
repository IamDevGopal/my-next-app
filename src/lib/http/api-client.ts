import { env } from "@/config/env";
import { ApiError } from "./api-error";
import type { ApiResponse, ApiSuccessResponse } from "./api-response.type";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: FormData | unknown;
  accessToken?: string;
}

let activeRequestCount = 0;
const apiActivityEventName = "taskflow:api-activity";

function emitApiActivity() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(apiActivityEventName, {
      detail: { activeRequestCount },
    }),
  );
}

function startApiActivity() {
  activeRequestCount += 1;
  emitApiActivity();
}

function finishApiActivity() {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  emitApiActivity();
}

export function getActiveApiRequestCount() {
  return activeRequestCount;
}

export function subscribeToApiActivity(
  listener: (activeRequests: number) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleActivity = (event: Event) => {
    const customEvent = event as CustomEvent<{ activeRequestCount: number }>;
    listener(customEvent.detail?.activeRequestCount ?? 0);
  };

  window.addEventListener(apiActivityEventName, handleActivity);

  return () => {
    window.removeEventListener(apiActivityEventName, handleActivity);
  };
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

  startApiActivity();

  try {
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
  } finally {
    finishApiActivity();
  }
}
