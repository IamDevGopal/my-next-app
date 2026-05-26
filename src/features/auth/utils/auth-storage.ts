const ACCESS_TOKEN_KEY = "taskflow.accessToken";
const REFRESH_TOKEN_KEY = "taskflow.refreshToken";

/**
 * Session-presence cookie read by the Next.js edge middleware to gate
 * `/dashboard` routes. The cookie value is intentionally NOT the access
 * token — tokens stay in localStorage (XSS scope), the cookie is a
 * non-sensitive boolean flag that the middleware can see at the edge.
 *
 * If tokens are ever moved to httpOnly cookies, this flag becomes
 * redundant and the middleware can read the auth cookie directly.
 */
const SESSION_FLAG_COOKIE = "tf.session";

export const ACCESS_TOKEN_ROTATED_EVENT = "taskflow:access-token-rotated";

function setSessionFlagCookie(maxAgeDays: number): void {
  if (typeof document === "undefined") return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  // SameSite=Lax so the cookie travels on top-level navigations to
  // /dashboard (so the edge middleware sees it on first request from a
  // fresh tab). Secure flag in production; bare in dev so localhost works.
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_FLAG_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearSessionFlagCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_FLAG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function storeAuthTokens(params: {
  accessToken: string;
  refreshToken: string;
}): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
  // Mirror the presence into a cookie so the edge middleware can decide
  // whether to even render `/dashboard` routes. 7-day expiry matches the
  // refresh-token lifetime; access-token rotation does NOT renew the cookie
  // because that would require knowing the refresh expiry — we re-set the
  // cookie at every storeAuthTokens (which fires on login + each refresh).
  setSessionFlagCookie(7);
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
  clearSessionFlagCookie();
}
