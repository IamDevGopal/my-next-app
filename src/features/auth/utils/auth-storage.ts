const ACCESS_TOKEN_KEY = "taskflow.accessToken";
const REFRESH_TOKEN_KEY = "taskflow.refreshToken";
const SESSION_VERSION_KEY = "taskflow.sessionVersion";

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
  /**
   * This non-credential hint travels on top-level navigations. HTTPS
   * origins also mark it Secure; server-side session checks remain final.
   */
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_FLAG_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearSessionFlagCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_FLAG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function storeAuthTokens(
  params: {
    accessToken: string;
    refreshToken: string;
  },
  options?: { expectedSessionVersion: string },
): boolean {
  if (options) {
    if (getAuthSessionVersion() !== options.expectedSessionVersion)
      return false;
  } else {
    const version = Array.from(
      window.crypto.getRandomValues(new Uint8Array(16)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem(SESSION_VERSION_KEY, version);
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
  /**
   * Cookie lifetime is a route hint, not the server's absolute session
   * lifetime. API expiry/revocation remains authoritative.
   */
  setSessionFlagCookie(7);
  notifyTokenChange(params.accessToken);
  return true;
}

export function getAuthSessionVersion(): string {
  /**
   * Existing browser credentials keep the legacy version until an explicit
   * login. Refresh must not create a new browser login identity.
   */
  return localStorage.getItem(SESSION_VERSION_KEY) ?? "legacy";
}

function notifyTokenChange(accessToken: string | null): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ACCESS_TOKEN_ROTATED_EVENT, {
        detail: { accessToken },
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
  localStorage.removeItem(SESSION_VERSION_KEY);
  clearSessionFlagCookie();
  notifyTokenChange(null);
}

export function subscribeToAuthTokenChanges(
  listener: (accessToken: string | null) => void,
): () => void {
  const handleTokenChange = () => listener(getAccessToken());
  const handleStorage = (event: StorageEvent) => {
    if (
      event.storageArea === localStorage &&
      (event.key === ACCESS_TOKEN_KEY || event.key === null)
    ) {
      handleTokenChange();
    }
  };
  window.addEventListener(ACCESS_TOKEN_ROTATED_EVENT, handleTokenChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(ACCESS_TOKEN_ROTATED_EVENT, handleTokenChange);
    window.removeEventListener("storage", handleStorage);
  };
}
