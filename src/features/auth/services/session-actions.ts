import { changePassword, logout, logoutAll, revokeSession } from "../api/auth.api";
import {
  clearAuthTokens,
  getAccessToken,
  getAuthSessionVersion,
  getRefreshToken,
} from "../utils/auth-storage";

const NOTICE_KEY = "taskflow.signOutNotice";
export const SIGN_OUT_NOTICE_EVENT = "taskflow:sign-out-notice";

export function takeSignOutNotice(): string | null {
  try {
    const notice = sessionStorage.getItem(NOTICE_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    return notice;
  } catch {
    return null;
  }
}

/**
 * Never erase credentials from a different login that completed while an
 * earlier security request was pending. Socket revocation may already have
 * cleared this login, so an empty store is also a completed local exit.
 */
function finishLocalSignOut(version: string, notice: string): boolean {
  if (getAccessToken() && getAuthSessionVersion() !== version) return false;
  try {
    sessionStorage.setItem(NOTICE_KEY, notice);
    window.dispatchEvent(new Event(SIGN_OUT_NOTICE_EVENT));
  } catch {
    /**
     * Notice storage failure must not prevent the browser from signing out.
     */
  }
  clearAuthTokens();
  return true;
}

export async function signOutCurrentSession() {
  const version = getAuthSessionVersion();
  const access = getAccessToken();
  const refresh = getRefreshToken();
  let serverConfirmed = false;
  try {
    if (access && refresh) {
      await logout(access, refresh);
      serverConfirmed = true;
    }
  } catch {
    /**
     * The browser can always exit. Server revocation remains unconfirmed
     * after timeout/offline/errors and must not be presented as successful.
     */
  }
  const message = serverConfirmed
    ? "You have been signed out."
    : "Signed out on this browser. Server sign-out could not be confirmed. Revoke this device from another signed-in device when connected.";
  return {
    serverConfirmed,
    sessionCleared: finishLocalSignOut(version, message),
  };
}

export async function signOutAllSessions(currentPassword: string) {
  const version = getAuthSessionVersion();
  const access = getAccessToken();
  if (!access) throw new Error("Please sign in again.");
  await logoutAll(access, currentPassword);
  return {
    sessionCleared: finishLocalSignOut(version, "All devices have been signed out."),
  };
}

export async function revokeDeviceSession(sessionId: string, isCurrent: boolean) {
  const version = getAuthSessionVersion();
  const access = getAccessToken();
  if (!access) throw new Error("Please sign in again.");
  await revokeSession(access, sessionId);
  return {
    sessionCleared:
      isCurrent &&
      finishLocalSignOut(version, "This device has been signed out."),
  };
}

export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string,
) {
  const version = getAuthSessionVersion();
  const access = getAccessToken();
  if (!access) throw new Error("Please sign in again.");
  await changePassword(access, currentPassword, newPassword);
  return {
    sessionCleared: finishLocalSignOut(
      version,
      "Password changed. Sign in with your new password; all previous sessions have ended.",
    ),
  };
}
