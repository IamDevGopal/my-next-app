import { env } from "@/config/env";
import { refreshAccessToken } from "@/features/auth/api/refresh-session";
import {
  clearAuthTokensIfCurrent,
  getAuthSessionVersion,
} from "@/features/auth/utils/auth-storage";
import { ApiError } from "./api-error";
import type { ApiResponse, ApiSuccessResponse } from "./api-response.type";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: FormData | unknown;
  accessToken?: string;
  /**
   * Refresh endpoints must not recursively start another refresh.
   */
  skipAuthRefresh?: boolean;
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
  const sessionVersion =
    typeof window !== "undefined" && options.accessToken
      ? getAuthSessionVersion()
      : undefined;
  return executeRequest<TData>(path, options, false, sessionVersion);
}

async function executeRequest<TData>(
  path: string,
  options: ApiRequestOptions,
  alreadyRetried: boolean,
  sessionVersion?: string,
): Promise<ApiSuccessResponse<TData>> {
  if (sessionVersion !== undefined && getAuthSessionVersion() !== sessionVersion) {
    throw new Error("The signed-in account changed. Please retry your action.");
  }
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
    if (sessionVersion !== undefined && getAuthSessionVersion() !== sessionVersion) {
      throw new Error("The signed-in account changed. Please retry your action.");
    }

    if (!payload.success) {
      /**
       * The auth adapter owns refresh coordination and terminal cleanup.
       * Transient errors propagate without deleting shared credentials.
       */
      const status = response.status;
      if (
        status === 401 &&
        payload.error.code === "AUTH_TOKEN_EXPIRED" &&
        options.accessToken &&
        sessionVersion !== undefined &&
        !options.skipAuthRefresh &&
        !alreadyRetried
      ) {
        const fresh = await refreshAccessToken(options.accessToken, sessionVersion);
        if (fresh) {
          return executeRequest<TData>(
            path,
            { ...options, accessToken: fresh },
            true,
            sessionVersion,
          );
        }
      }
      if (
        status === 401 &&
        sessionVersion !== undefined &&
        options.accessToken &&
        (payload.error.code === "AUTH_TOKEN_INVALID" ||
          payload.error.code === "AUTH_REFRESH_TOKEN_REVOKED" ||
          (payload.error.code === "AUTH_TOKEN_EXPIRED" && alreadyRetried))
      ) {
        clearAuthTokensIfCurrent(sessionVersion, options.accessToken);
      }
      throw new ApiError(payload);
    }

    return payload;
  } finally {
    finishApiActivity();
  }
}
