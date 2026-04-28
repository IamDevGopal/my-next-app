import { z } from "zod";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema";

export type LoginFormValues = z.infer<typeof loginSchema>;
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
    role: "ADMIN" | "MEMBER";
  };
}

export interface MeData {
  user: LoginData["user"];
}

export interface ForgotPasswordData {
  resetToken?: string;
}
