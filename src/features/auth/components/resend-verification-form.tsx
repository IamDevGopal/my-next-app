"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resendVerification } from "../api/auth.api";
import { resendVerificationSchema } from "../schemas/auth.schema";
import type { ResendVerificationFormValues } from "../types/auth.type";
import { AuthFormLink } from "./auth-form-link";
import { FormField } from "./form-field";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function ResendVerificationForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ResendVerificationFormValues) {
    setMessage(null);
    setDevToken(null);
    try {
      const response = await resendVerification(values);
      setMessage(
        response.message ??
          "If an account exists for this email, a verification link will be sent.",
      );
      setDevToken(response.data.verificationToken ?? null);
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
      {message ? <FormMessage>{message}</FormMessage> : null}
      {devToken ? (
        <FormMessage tone="code">
          Dev verification token: {devToken}
          <br />
          <Link
            className="font-semibold text-emerald-700 underline"
            href={`/verify-email?token=${encodeURIComponent(devToken)}`}
          >
            Open verification page →
          </Link>
        </FormMessage>
      ) : null}
      <SubmitButton isSubmitting={isSubmitting}>
        Send verification link
      </SubmitButton>
      <AuthFormLink href="/login">Back to login</AuthFormLink>
    </form>
  );
}
