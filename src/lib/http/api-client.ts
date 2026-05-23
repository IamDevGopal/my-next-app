import { env } from "@/config/env";
import {
  clearAuthTokens,
  getRefreshToken,
  storeAuthTokens,
} from "@/features/auth/utils/auth-storage";
import { ApiError } from "./api-error";
import type { ApiResponse, ApiSuccessResponse } from "./api-response.type";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: FormData | unknown;
  accessToken?: string;
  /** Skip the built-in 401 → refresh → retry flow (use on /auth/refresh itself). */
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

// ── Token refresh coordination ──────────────────────────────────────────
// Multiple in-flight 401s should NOT trigger N parallel refresh calls. We
// share a single Promise so all callers await the same refresh attempt.

let activeRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (activeRefresh) return activeRefresh;

  activeRefresh = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        },
      );

      if (!response.ok) return null;

      const payload = (await response.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;

      if (!payload.success) return null;

      storeAuthTokens({
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken,
      });

      return payload.data.accessToken;
    } catch {
      return null;
    } finally {
      activeRefresh = null;
    }
  })();

  return activeRefresh;
}

export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiSuccessResponse<TData>> {
  return executeRequest<TData>(path, options, /*alreadyRetried*/ false);
}

async function executeRequest<TData>(
  path: string,
  options: ApiRequestOptions,
  alreadyRetried: boolean,
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
      // 401 from any authenticated endpoint → try a single refresh and retry.
      // We only attempt this when the caller actually passed an accessToken
      // (so anonymous requests don't trigger refresh) and not for the
      // /auth/refresh call itself (would infinite loop on bad refresh token).
      const status = payload.meta.statusCode;
      if (
        status === 401 &&
        options.accessToken &&
        !options.skipAuthRefresh &&
        !alreadyRetried
      ) {
        const fresh = await refreshAccessToken();
        if (fresh) {
          return executeRequest<TData>(
            path,
            { ...options, accessToken: fresh },
            true,
          );
        }
        // Refresh failed → cooperate with the auth shell so it can redirect
        // to login on the next render tick.
        clearAuthTokens();
      }
      throw new ApiError(payload);
    }

    return payload;
  } finally {
    finishApiActivity();
  }
}
