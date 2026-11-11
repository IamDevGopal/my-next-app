import { apiRequest } from "@/lib/http/api-client";
import { ApiError } from "@/lib/http/api-error";
import type { ApiErrorResponse } from "@/lib/http/api-response.type";
import { env } from "@/config/env";
import { refreshAccessToken } from "@/features/auth/api/refresh-session";
import {
  getAccessToken,
  getAuthSessionVersion,
} from "@/features/auth/utils/auth-storage";

interface TaskRequestOptions extends Omit<RequestInit, "body"> {
  accessToken: string;
  body?: unknown;
}

async function bounded<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  writing: boolean,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          writing
            ? "Task request timed out. Refresh to confirm whether the change was saved before retrying."
            : "Task request timed out. Please refresh and try again.",
        ),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export function requestTaskApi<T>(path: string, options: TaskRequestOptions) {
  const writing = options.method !== undefined && options.method !== "GET";
  const timeout =
    options.body instanceof FormData ? 60_000 : writing ? 30_000 : 15_000;
  return bounded(
    (signal) => apiRequest<T>(path, { ...options, signal }),
    timeout,
    writing,
  );
}

export function requestTaskBlob(
  path: string,
  accessToken: string,
): Promise<Blob> {
  const version = getAuthSessionVersion();
  const assertCurrent = () => {
    if (getAuthSessionVersion() !== version)
      throw new Error(
        "The signed-in account changed. Open the attachment again.",
      );
  };
  return bounded(
    async (signal) => {
      async function fetchBlob(token: string, retried = false): Promise<Blob> {
        assertCurrent();
        const response = await fetch(env.NEXT_PUBLIC_API_BASE_URL + path, {
          method: "GET",
          headers: { authorization: "Bearer " + token },
          cache: "no-store",
          signal,
        });
        assertCurrent();
        if (!response.ok) {
          if (
            !response.headers.get("content-type")?.includes("application/json")
          )
            throw new Error("Attachment download failed.");
          const payload = (await response.json()) as ApiErrorResponse;
          assertCurrent();
          if (
            response.status === 401 &&
            payload.error?.code === "AUTH_TOKEN_EXPIRED" &&
            !retried
          ) {
            const fresh = await refreshAccessToken(token, version);
            if (fresh) return fetchBlob(fresh, true);
          }
          throw new ApiError(payload);
        }
        if (response.headers.get("content-type")?.includes("application/json"))
          throw new Error(
            "Attachment endpoint returned an unexpected response.",
          );
        const blob = await response.blob();
        assertCurrent();
        return blob;
      }
      return fetchBlob(getAccessToken() ?? accessToken);
    },
    60_000,
    false,
  );
}
