import { apiRequest } from "@/lib/http/api-client";
import { ApiError } from "@/lib/http/api-error";
import { env } from "@/config/env";
import { z } from "zod";
import { refreshAccessToken } from "./refresh-session";
import { getAccessToken, getAuthSessionVersion } from "../utils/auth-storage";
import type {
  ForgotPasswordData,
  ForgotPasswordFormValues,
  LoginData,
  LoginFormValues,
  MeData,
  RegisterData,
  RegisterFormValues,
  ResendVerificationData,
  ResendVerificationFormValues,
  ResetPasswordFormValues,
  SessionsListData,
  VerifyEmailFormValues,
} from "../types/auth.type";

export function login(payload: LoginFormValues) {
  return apiRequest<LoginData>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function register(payload: RegisterFormValues) {
  return apiRequest<RegisterData>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function verifyEmail(payload: VerifyEmailFormValues) {
  /**
   * Successful verification also creates a login session.
   */
  return apiRequest<LoginData>("/auth/verify-email", {
    method: "POST",
    body: payload,
  });
}

export function resendVerification(payload: ResendVerificationFormValues) {
  return apiRequest<ResendVerificationData>("/auth/resend-verification", {
    method: "POST",
    body: payload,
  });
}

export function forgotPassword(payload: ForgotPasswordFormValues) {
  return apiRequest<ForgotPasswordData>("/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export function resetPassword(payload: ResetPasswordFormValues) {
  return apiRequest<Record<string, never>>("/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

export function me(accessToken: string) {
  return apiRequest<MeData>("/auth/me", {
    method: "GET",
    accessToken,
  });
}

export function listSessions(accessToken: string) {
  return apiRequest<SessionsListData>("/auth/sessions", {
    method: "GET",
    accessToken,
  });
}

export function revokeSession(accessToken: string, sessionId: string) {
  return securityRequest(
    `/auth/sessions/${sessionId}`,
    accessToken,
    undefined,
    "DELETE",
  );
}

const SECURITY_REQUEST_TIMEOUT_MS = 20_000;
const MAX_SECURITY_REQUEST_ATTEMPTS = 2;
const SECURITY_REQUEST_TIMEOUT_MESSAGE = "The request timed out. Please retry.";

const securityResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), message: z.string() }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
    meta: z.object({
      timestamp: z.string(),
      path: z.string(),
      method: z.string(),
      statusCode: z.number().int(),
      requestId: z.string().optional(),
    }),
  }),
]);

/**
 * These operations may revoke the caller before their HTTP response arrives.
 * Read the response independently of local auth cleanup, but never retry an
 * old-account operation under a new login. Only access expiry can refresh.
 */
async function securityRequest(
  path: string,
  accessToken: string,
  body: unknown,
  method: "POST" | "DELETE" = "POST",
) {
  const version = getAuthSessionVersion();
  if (getAccessToken() !== accessToken) {
    throw new Error("Your session changed. Please retry.");
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    SECURITY_REQUEST_TIMEOUT_MS,
  );
  try {
    for (let attempt = 0; attempt < MAX_SECURITY_REQUEST_ATTEMPTS; attempt++) {
      const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("The server returned an invalid response. Please retry.");
      }
      const parsed = securityResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error("The server returned an invalid response. Please retry.");
      }
      const payload = parsed.data;
      if (payload.success && response.ok) return { message: payload.message };
      if (payload.success) {
        throw new Error("The security action could not be confirmed.");
      }
      if (
        response.status === 401 &&
        payload.error.code === "AUTH_TOKEN_EXPIRED" &&
        attempt === 0 &&
        getAuthSessionVersion() === version
      ) {
        let abortRefreshWait: () => void = () => {};
        const aborted = new Promise<never>((_resolve, reject) => {
          abortRefreshWait = () =>
            reject(new Error(SECURITY_REQUEST_TIMEOUT_MESSAGE));
          if (controller.signal.aborted) abortRefreshWait();
          else {
            controller.signal.addEventListener("abort", abortRefreshWait, {
              once: true,
            });
          }
        });
        let fresh: string | null;
        try {
          fresh = await Promise.race([
            refreshAccessToken(accessToken, version),
            aborted,
          ]);
        } finally {
          controller.signal.removeEventListener("abort", abortRefreshWait);
        }
        if (
          fresh &&
          getAuthSessionVersion() === version &&
          !controller.signal.aborted
        ) {
          accessToken = fresh;
          continue;
        }
      }
      throw new ApiError({
        success: false,
        error: {
          code: payload.error.code,
          message: payload.error.message,
          details: payload.error.details ?? null,
        },
        meta: { ...payload.meta, statusCode: response.status },
      });
    }
    throw new Error("Please retry the security action.");
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(SECURITY_REQUEST_TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function logout(accessToken: string, refreshToken: string) {
  return securityRequest("/auth/logout", accessToken, { refreshToken });
}

export function logoutAll(accessToken: string, currentPassword: string) {
  return securityRequest("/auth/logout-all", accessToken, { currentPassword });
}

export function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
) {
  return securityRequest("/auth/change-password", accessToken, {
    currentPassword,
    newPassword,
  });
}
