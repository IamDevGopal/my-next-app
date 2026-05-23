import { apiRequest } from "@/lib/http/api-client";
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
  // Successful verification auto-logs in — backend returns LoginData.
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

export function refreshTokens(refreshToken: string) {
  return apiRequest<LoginData>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    // Tell the api-client not to attempt its own 401 → refresh → retry on
    // THIS request — otherwise a refresh failure would loop infinitely.
    skipAuthRefresh: true,
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
