"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { forgotPassword } from "../api/auth.api";
import { forgotPasswordSchema } from "../schemas/auth.schema";
import type { ForgotPasswordFormValues } from "../types/auth.type";
import { FormField } from "./form-field";
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
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {devToken ? (
        <p className="break-all rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700">
          Dev reset token: {devToken}
        </p>
      ) : null}
      <SubmitButton isSubmitting={isSubmitting}>Send reset link</SubmitButton>
      <Link
        className="block text-center text-sm font-medium text-emerald-700 hover:text-emerald-900"
        href="/login"
      >
        Back to login
      </Link>
    </form>
  );
}
