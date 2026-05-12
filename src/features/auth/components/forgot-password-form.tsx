"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { forgotPassword } from "../api/auth.api";
import { forgotPasswordSchema } from "../schemas/auth.schema";
import type { ForgotPasswordFormValues } from "../types/auth.type";
import { AuthFormLink } from "./auth-form-link";
import { FormField } from "./form-field";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setMessage(null);
    setDevToken(null);
    try {
      const response = await forgotPassword(values);
      setMessage(response.message || "If the account exists, reset instructions were sent.");
      setDevToken(response.data.resetToken ?? null);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormField
        error={errors.email?.message}
        id="email"
        label="Email"
        type="email"
        {...register("email")}
      />
      {message ? (
        <FormMessage>{message}</FormMessage>
      ) : null}
      {devToken ? (
        <FormMessage tone="code">Dev reset token: {devToken}</FormMessage>
      ) : null}
      <SubmitButton isSubmitting={isSubmitting}>Send reset link</SubmitButton>
      <AuthFormLink href="/login">Back to login</AuthFormLink>
    </form>
  );
}
