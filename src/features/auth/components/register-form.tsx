"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { register as registerUser } from "../api/auth.api";
import { registerSchema } from "../schemas/auth.schema";
import type { RegisterFormValues } from "../types/auth.type";
import { AuthFormLink } from "./auth-form-link";
import { FormField } from "./form-field";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function RegisterForm() {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setFormMessage(null);
    setDevToken(null);
    try {
      const response = await registerUser(values);
      setSubmittedEmail(values.email);
      setFormMessage(
        response.message ??
          "Registration successful. Check your email to verify your account.",
      );
      // Dev convenience: backend leaks the verification token in non-production
      // so we can complete the flow without a real SMTP server.
      setDevToken(response.data.verificationToken ?? null);
    } catch (error) {
      setFormMessage(getErrorMessage(error));
    }
  }

  // After a successful submit, hide the form and show the "check your email"
  // panel. Avoids accidentally re-submitting and re-triggering rate limits.
  if (isSubmitSuccessful && submittedEmail) {
    return (
      <div className="space-y-4">
        <FormMessage tone="success">
          {formMessage ?? "Registration successful."}
        </FormMessage>
        <p className="text-sm leading-6 text-slate-600">
          We just sent a verification link to{" "}
          <span className="font-semibold text-slate-950">{submittedEmail}</span>
          . Open the email and click the link to activate your account.
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
    <form className="space-y-3.5" onSubmit={handleSubmit(onSubmit)}>
      <FormField
        error={errors.name?.message}
        id="name"
        label="Full name"
        placeholder="Jane Doe"
        type="text"
        {...registerField("name")}
      />
      <FormField
        error={errors.email?.message}
        id="email"
        label="Email"
        placeholder="you@example.com"
        type="email"
        {...registerField("email")}
      />
      <FormField
        error={errors.password?.message}
        id="password"
        label="Password"
        placeholder="At least 8 characters"
        type="password"
        {...registerField("password")}
      />
      {formMessage ? <FormMessage>{formMessage}</FormMessage> : null}
      <SubmitButton isSubmitting={isSubmitting}>Create account</SubmitButton>
      <AuthFormLink href="/login">Already have an account? Sign in</AuthFormLink>
    </form>
  );
}
