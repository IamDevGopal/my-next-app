const ACCESS_TOKEN_KEY = "taskflow.accessToken";
const REFRESH_TOKEN_KEY = "taskflow.refreshToken";

export const ACCESS_TOKEN_ROTATED_EVENT = "taskflow:access-token-rotated";

export function storeAuthTokens(params: {
  accessToken: string;
  refreshToken: string;
}): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
  // Broadcast so React components subscribed to the access token (dashboard
  // page, socket hooks, etc.) can pick up the new value without a reload.
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ACCESS_TOKEN_ROTATED_EVENT, {
        detail: { accessToken: params.accessToken },
      }),
    );
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
