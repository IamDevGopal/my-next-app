"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { forgotPassword } from "../api/auth.api";
import { forgotPasswordSchema } from "../schemas/auth.schema";
import type { ForgotPasswordFormValues } from "../types/auth.type";
import { AuthFormLink } from "./auth-form-link";
import { FormField } from "./form-field";
import { FormMessage, type FormFeedback } from "./form-message";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function ForgotPasswordForm() {
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
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
    setFeedback(null);
    setDevToken(null);
    try {
      const response = await forgotPassword(values);
      setFeedback({
        message:
          response.message ||
          "If the account exists, reset instructions will be sent.",
        tone: "success",
      });
      setDevToken(response.data.resetToken ?? null);
    } catch (error) {
      setFeedback({ message: getErrorMessage(error), tone: "danger" });
    }
  }

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormField
        error={errors.email?.message}
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        {...register("email")}
      />
      <FormMessage tone={feedback?.tone}>{feedback?.message}</FormMessage>
      {devToken ? (
        <FormMessage tone="code">
          Dev reset token: {devToken}
          <br />
          <Link
            className="font-semibold text-emerald-700 underline"
            href={`/reset-password?token=${encodeURIComponent(devToken)}`}
          >
            Open reset page
          </Link>
        </FormMessage>
      ) : null}
      <SubmitButton isSubmitting={isSubmitting}>Send reset link</SubmitButton>
      <AuthFormLink href="/login">Back to login</AuthFormLink>
    </form>
  );
}
