"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { login } from "../api/auth.api";
import { loginSchema } from "../schemas/auth.schema";
import type { LoginFormValues } from "../types/auth.type";
import { storeAuthTokens } from "../utils/auth-storage";
import { AuthFormLink } from "./auth-form-link";
import { FormField } from "./form-field";
import { FormMessage } from "./form-message";
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
        <FormMessage tone="neutral">{formMessage}</FormMessage>
      ) : null}
      <SubmitButton isSubmitting={isSubmitting}>Sign in</SubmitButton>
      <AuthFormLink href="/forgot-password">Forgot password?</AuthFormLink>
    </form>
  );
}
