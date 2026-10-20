import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your full name")
    .max(120, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32, "Verification token is invalid"),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, "Reset token is invalid"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters"),
});

export const logoutAllSchema = z.object({
  currentPassword: z.string().min(8, "Enter your current password").max(128, "Password must be at most 128 characters"),
});

export const changePasswordSchema = logoutAllSchema.extend({
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters"),
  confirmPassword: z.string().min(1, "Confirm your new password").max(128, "Password must be at most 128 characters"),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: "Passwords do not match", path: ["confirmPassword"],
});
