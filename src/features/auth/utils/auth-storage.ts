const ACCESS_TOKEN_KEY = "taskflow.accessToken";
const REFRESH_TOKEN_KEY = "taskflow.refreshToken";

export function storeAuthTokens(params: {
  accessToken: string;
  refreshToken: string;
}): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, params.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, params.refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
