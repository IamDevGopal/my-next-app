"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { login } from "../api/auth.api";
import { loginSchema } from "../schemas/auth.schema";
import type { LoginFormValues } from "../types/auth.type";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

export function LoginForm() {
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
      localStorage.setItem("taskflow.accessToken", response.data.accessToken);
      localStorage.setItem("taskflow.refreshToken", response.data.refreshToken);
      setFormMessage(response.message || `Welcome back, ${response.data.user.name}.`);
    } catch (error) {
      setFormMessage(getErrorMessage(error));
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
      <FormField
        error={errors.password?.message}
        id="password"
        label="Password"
        type="password"
        {...register("password")}
      />
      {formMessage ? (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800">
          {formMessage}
        </p>
      ) : null}
      <SubmitButton isSubmitting={isSubmitting}>Sign in</SubmitButton>
      <Link
        className="block text-center text-sm font-medium text-emerald-700 hover:text-emerald-900"
        href="/forgot-password"
      >
        Forgot password?
      </Link>
    </form>
  );
}
