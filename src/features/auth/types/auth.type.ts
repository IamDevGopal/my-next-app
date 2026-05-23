import { z } from "zod";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../schemas/auth.schema";

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationFormValues = z.infer<
  typeof resendVerificationSchema
>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export interface LoginData {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: "USER";
  };
}

export interface MeData {
  user: LoginData["user"];
}

export interface ForgotPasswordData {
  resetToken?: string;
}

/**
 * Register response intentionally does NOT include tokens — user must verify
 * their email before signing in. `verificationToken` is only present in dev
 * mode (NODE_ENV !== production on the backend) for local testing without SMTP.
 */
export interface RegisterData {
  user: LoginData["user"];
  verificationToken?: string;
}

export interface ResendVerificationData {
  verificationToken?: string;
}
