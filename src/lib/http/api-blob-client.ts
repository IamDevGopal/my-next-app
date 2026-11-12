import { env } from "@/config/env";
import { refreshAccessToken } from "@/features/auth/api/refresh-session";
import {
  getAccessToken,
  getAuthSessionVersion,
} from "@/features/auth/utils/auth-storage";
import { ApiError } from "./api-error";
import type { ApiErrorResponse } from "./api-response.type";

export async function requestApiBlob(
  path: string,
  accessToken: string,
  timeoutMs = 60_000,
  requestSignal?: AbortSignal,
): Promise<Blob> {
  const sessionVersion = getAuthSessionVersion();
  const assertCurrentSession = () => {
    if (getAuthSessionVersion() !== sessionVersion) {
      throw new Error(
        "The signed-in account changed. Please retry the download.",
      );
    }
  };
  const controller = new AbortController();
  const abortFromRequest = () => controller.abort();
  if (requestSignal?.aborted) controller.abort();
  else
    requestSignal?.addEventListener("abort", abortFromRequest, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  async function fetchBlob(token: string, retried = false): Promise<Blob> {
    assertCurrentSession();
    const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    });
    assertCurrentSession();

    if (!response.ok) {
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("The file download failed. Please retry.");
      }
      const payload = (await response.json()) as ApiErrorResponse;
      assertCurrentSession();
      if (
        response.status === 401 &&
        payload.error?.code === "AUTH_TOKEN_EXPIRED" &&
        !retried
      ) {
        const freshToken = await refreshAccessToken(token, sessionVersion);
        if (freshToken) return fetchBlob(freshToken, true);
      }
      throw new ApiError(payload);
    }

    const blob = await response.blob();
    assertCurrentSession();
    return blob;
  }

  try {
    return await fetchBlob(getAccessToken() ?? accessToken);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The file download timed out. Please retry.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    requestSignal?.removeEventListener("abort", abortFromRequest);
  }
}

export async function downloadApiBlob(
  path: string,
  accessToken: string,
  fileName: string,
): Promise<void> {
  const blob = await requestApiBlob(path, accessToken);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  try {
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
}
