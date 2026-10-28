"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ApiError } from "@/lib/http/api-error";
import { resetPassword } from "../api/auth.api";
import { resetPasswordSchema } from "../schemas/auth.schema";
import type { ResetPasswordFormValues } from "../types/auth.type";
import { AuthFormLink } from "./auth-form-link";
import { FormField } from "./form-field";
import { FormMessage, type FormFeedback } from "./form-message";
import { PasswordGuidance } from "./password-guidance";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const parsed = resetPasswordSchema.shape.token.safeParse(token);

  if (!parsed.success) {
    return (
      <div className="space-y-4">
        <FormMessage tone="danger">
          This reset link is missing or invalid. Request a new link to continue.
        </FormMessage>
        <AuthFormLink href="/forgot-password">
          Request a new reset link
        </AuthFormLink>
        <AuthFormLink href="/login">Back to login</AuthFormLink>
      </div>
    );
  }

  /**
   * A changed URL remounts the form so credentials, errors and completion
   * from an earlier single-use link cannot carry over to another token.
   */
  return <ResetPasswordLinkForm key={token} token={parsed.data} />;
}

function ResetPasswordLinkForm({ token }: { token: string }) {
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [phase, setPhase] = useState<"ready" | "completed" | "invalid">(
    "ready",
  );
  const {
    register,
    control,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      newPassword: "",
    },
  });
  const password = useWatch({ control, name: "newPassword", defaultValue: "" });

  async function onSubmit(values: ResetPasswordFormValues) {
    setFeedback(null);
    try {
      const response = await resetPassword(values);
      resetField("newPassword");
      setPhase("completed");
      setFeedback({
        message:
          response.message || "Password reset successful. You can now sign in.",
        tone: "success",
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "AUTH_PASSWORD_RESET_TOKEN_INVALID"
      ) {
        resetField("newPassword");
        setPhase("invalid");
      }
      setFeedback({ message: getErrorMessage(error), tone: "danger" });
    }
  }

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      {phase === "ready" ? (
        <>
          <input type="hidden" {...register("token")} />
          <FormField
            error={errors.newPassword?.message}
            id="newPassword"
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            hint={<PasswordGuidance password={password} />}
            {...register("newPassword")}
          />
          <SubmitButton isSubmitting={isSubmitting}>
            Reset password
          </SubmitButton>
        </>
      ) : null}
      <FormMessage tone={feedback?.tone}>{feedback?.message}</FormMessage>
      {phase !== "completed" ? (
        <AuthFormLink href="/forgot-password">
          Request a new reset link
        </AuthFormLink>
      ) : null}
      <AuthFormLink href="/login">Back to login</AuthFormLink>
    </form>
  );
}
