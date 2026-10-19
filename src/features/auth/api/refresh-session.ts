import { env } from "@/config/env";
import type { ApiResponse } from "@/lib/http/api-response.type";
import type { LoginData } from "../types/auth.type";
import {
  clearAuthTokens,
  getAccessToken,
  getAuthSessionVersion,
  getRefreshToken,
  storeAuthTokens,
} from "../utils/auth-storage";

const REFRESH_LOCK = "taskflow:auth:refresh";
const REFRESH_TIMEOUT_MS = 20_000;
let activeRefresh: {
  sessionVersion: string;
  promise: Promise<string | null>;
} | null = null;

function latestAccessToken(
  expectedAccessToken: string,
  expectedSessionVersion: string,
): string | null {
  if (getAuthSessionVersion() !== expectedSessionVersion) return null;
  const current = getAccessToken();
  return current && current !== expectedAccessToken ? current : null;
}

async function rotateSession(
  expectedAccessToken: string,
  expectedSessionVersion: string,
  signal: AbortSignal,
): Promise<string | null> {
  const current = getAccessToken();
  if (!current) return null;
  if (getAuthSessionVersion() !== expectedSessionVersion) return null;
  if (current !== expectedAccessToken) return current;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal,
    });

    /**
     * Logout, another login, or another refresh may have completed while
     * the request was in flight. Never restore or overwrite their state.
     */
    if (
      getRefreshToken() !== refreshToken ||
      getAuthSessionVersion() !== expectedSessionVersion ||
      getAccessToken() !== expectedAccessToken
    ) {
      return latestAccessToken(expectedAccessToken, expectedSessionVersion);
    }

    if (response.status === 409) {
      if (attempt === 0) continue;
      throw new Error("Your session changed in another tab. Please retry.");
    }
    if (response.status === 401 || response.status === 403) {
      clearAuthTokens();
      return null;
    }
    if (!response.ok) {
      throw new Error("Session refresh is temporarily unavailable. Please retry.");
    }

    const payload = (await response.json()) as ApiResponse<LoginData>;
    if (
      !payload.success ||
      typeof payload.data.accessToken !== "string" ||
      !payload.data.accessToken ||
      typeof payload.data.refreshToken !== "string" ||
      !payload.data.refreshToken
    ) {
      throw new Error("The session refresh response was invalid. Please retry.");
    }

    /**
     * JSON parsing is asynchronous too; repeat the ownership check before
     * committing the returned pair to shared browser storage.
     */
    if (
      getRefreshToken() !== refreshToken ||
      getAuthSessionVersion() !== expectedSessionVersion ||
      getAccessToken() !== expectedAccessToken
    ) {
      return latestAccessToken(expectedAccessToken, expectedSessionVersion);
    }
    if (!storeAuthTokens(payload.data, { expectedSessionVersion })) return null;
    return payload.data.accessToken;
  }

  return null;
}

/**
 * One promise coordinates callers in this tab. Web Locks serialize the
 * same-origin tabs; the server's bounded, persisted recovery path handles
 * browsers without Web Locks and duplicate/lost-response requests.
 */
export function refreshAccessToken(
  expectedAccessToken: string,
  expectedSessionVersion: string,
): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (getAuthSessionVersion() !== expectedSessionVersion) {
    return Promise.resolve(null);
  }
  if (activeRefresh?.sessionVersion === expectedSessionVersion) {
    return activeRefresh.promise;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REFRESH_TIMEOUT_MS,
  );
  const refresh = async () => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request(
        REFRESH_LOCK,
        { mode: "exclusive", signal: controller.signal },
        () => rotateSession(expectedAccessToken, expectedSessionVersion, controller.signal),
      );
    }
    return rotateSession(expectedAccessToken, expectedSessionVersion, controller.signal);
  };

  const promise = refresh().finally(() => {
    window.clearTimeout(timeout);
    if (activeRefresh?.promise === promise) activeRefresh = null;
  });
  activeRefresh = { sessionVersion: expectedSessionVersion, promise };
  return promise;
}
