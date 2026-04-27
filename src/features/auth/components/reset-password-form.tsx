"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetPassword } from "../api/auth.api";
import { resetPasswordSchema } from "../schemas/auth.schema";
import type { ResetPasswordFormValues } from "../types/auth.type";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: searchParams.get("token") ?? "",
      newPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    setMessage(null);
    try {
      const response = await resetPassword(values);
      setMessage(response.message || "Password reset successful. You can now sign in.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormField
        error={errors.token?.message}
        id="token"
        label="Reset token"
        type="text"
        {...register("token")}
      />
      <FormField
        error={errors.newPassword?.message}
        id="newPassword"
        label="New password"
        type="password"
        {...register("newPassword")}
      />
      {message ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      <SubmitButton isSubmitting={isSubmitting}>Reset password</SubmitButton>
      <Link
        className="block text-center text-sm font-medium text-emerald-700 hover:text-emerald-900"
        href="/login"
      >
        Back to login
      </Link>
    </form>
  );
}
