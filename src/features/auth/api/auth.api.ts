import { apiRequest } from "@/lib/http/api-client";
import type {
  ForgotPasswordData,
  ForgotPasswordFormValues,
  LoginData,
  LoginFormValues,
  ResetPasswordFormValues,
} from "../types/auth.type";

export function login(payload: LoginFormValues) {
  return apiRequest<LoginData>("/auth/login", {
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
