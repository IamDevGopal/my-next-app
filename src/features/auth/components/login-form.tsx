"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { login } from "../api/auth.api";
import { loginSchema } from "../schemas/auth.schema";
import type { LoginFormValues } from "../types/auth.type";
import { storeAuthTokens } from "../utils/auth-storage";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function LoginForm() {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormMessage(null);
    try {
      const response = await login(values);
      storeAuthTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      setFormMessage(response.message || `Welcome back, ${response.data.user.name}.`);
      router.replace("/dashboard");
    } catch (error) {
      setFormMessage(getErrorMessage(error));
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <FormField
        error={errors.email?.message}
        id="email"
        label="Email"
        placeholder="admin@company.com"
        type="email"
        {...register("email")}
      />
      <FormField
        error={errors.password?.message}
        id="password"
        label="Password"
        placeholder="Enter your password"
        type="password"
        {...register("password")}
      />
      {formMessage ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
          {formMessage}
        </p>
      ) : null}
      <SubmitButton isSubmitting={isSubmitting}>Sign in</SubmitButton>
      <Link
        className="block text-center text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
        href="/forgot-password"
      >
        Forgot password?
      </Link>
    </form>
  );
}
