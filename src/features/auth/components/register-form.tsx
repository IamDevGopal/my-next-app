"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { register as registerUser } from "../api/auth.api";
import { registerSchema } from "../schemas/auth.schema";
import type { RegisterFormValues } from "../types/auth.type";
import { AuthFormLink } from "./auth-form-link";
import { FormField } from "./form-field";
import { FormMessage, type FormFeedback } from "./form-message";
import { PasswordGuidance } from "./password-guidance";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function RegisterForm() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const {
    register: registerField,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });
  const password = useWatch({ control, name: "password", defaultValue: "" });

  async function onSubmit(values: RegisterFormValues) {
    setFeedback(null);
    setDevToken(null);
    try {
      const response = await registerUser(values);
      setSubmittedEmail(values.email);
      setFeedback({
        message:
          response.message ??
          "Registration successful. Check your email to verify your account.",
        tone: "success",
      });
      /**
       * The API includes this convenience only in explicit development
       * mode, never in test, staging or production.
       */
      setDevToken(response.data.verificationToken ?? null);
    } catch (error) {
      setFeedback({ message: getErrorMessage(error), tone: "danger" });
    }
  }

  /**
   * Keep successful registration on the recovery panel to avoid duplicate
   * account submissions while durable email delivery is pending.
   */
  if (submittedEmail) {
    return (
      <div className="space-y-4">
        <FormMessage tone="success">
          {feedback?.message ?? "Registration successful."}
        </FormMessage>
        <p className="text-sm leading-6 text-slate-600">
          Your verification email is queued for{" "}
          <span className="font-semibold text-slate-950">{submittedEmail}</span>
          . When it arrives, open the link to activate your account.
        </p>
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
        <button
          className="w-full rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => router.push("/resend-verification")}
          type="button"
        >
          Didn&rsquo;t receive the email? Resend
        </button>
        <AuthFormLink href="/login">Back to login</AuthFormLink>
      </div>
    );
  }

  return (
    <form className="space-y-3.5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormField
        error={errors.name?.message}
        id="name"
        label="Full name"
        placeholder="Jane Doe"
        type="text"
        autoComplete="name"
        required
        {...registerField("name")}
      />
      <FormField
        error={errors.email?.message}
        id="email"
        label="Email"
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        required
        {...registerField("email")}
      />
      <FormField
        error={errors.password?.message}
        id="password"
        label="Password"
        placeholder="At least 8 characters"
        type="password"
        autoComplete="new-password"
        required
        hint={<PasswordGuidance password={password} />}
        {...registerField("password")}
      />
      <FormMessage tone={feedback?.tone}>{feedback?.message}</FormMessage>
      <SubmitButton isSubmitting={isSubmitting}>Create account</SubmitButton>
      <AuthFormLink href="/login">
        Already have an account? Sign in
      </AuthFormLink>
    </form>
  );
}
