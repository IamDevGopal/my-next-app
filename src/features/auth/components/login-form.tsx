"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  SIGN_OUT_NOTICE_EVENT,
  takeSignOutNotice,
} from "../services/session-actions";
import { useForm } from "react-hook-form";
import { login } from "../api/auth.api";
import { loginSchema } from "../schemas/auth.schema";
import type { LoginFormValues } from "../types/auth.type";
import { getAuthSessionVersion, storeAuthTokens } from "../utils/auth-storage";
import { AuthFormLink } from "./auth-form-link";
import { FormField } from "./form-field";
import { FormMessage, type FormFeedback } from "./form-message";
import { SubmitButton } from "./submit-button";
import { getErrorMessage } from "@/lib/http/get-error-message";

/**
 * Only dashboard destinations on this origin are valid post-login targets.
 * URL normalization also rejects traversal out of that allowed area.
 */
function getLoginDestination(next: string | null): string {
  if (!next?.startsWith("/") || next.startsWith("//")) return "/dashboard";
  try {
    const destination = new URL(next, window.location.origin);
    if (
      destination.origin === window.location.origin &&
      (destination.pathname === "/dashboard" ||
        destination.pathname.startsWith("/dashboard/"))
    ) {
      return `${destination.pathname}${destination.search}${destination.hash}`;
    }
  } catch {
    return "/dashboard";
  }
  return "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const showNotice = () => {
      const notice = takeSignOutNotice();
      if (notice) setFeedback({ message: notice, tone: "neutral" });
    };
    showNotice();
    window.addEventListener(SIGN_OUT_NOTICE_EVENT, showNotice);
    return () => {
      mounted.current = false;
      window.removeEventListener(SIGN_OUT_NOTICE_EVENT, showNotice);
    };
  }, []);
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
    const sessionVersion = getAuthSessionVersion();
    setFeedback(null);
    try {
      const response = await login(values);
      /**
       * Leaving this page or signing in elsewhere while the request waits
       * must not let a stale response replace the browser's newer login.
       */
      if (!mounted.current || getAuthSessionVersion() !== sessionVersion)
        return;
      storeAuthTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      setFeedback({
        message:
          response.message || `Welcome back, ${response.data.user.name}.`,
        tone: "success",
      });
      router.replace(getLoginDestination(searchParams?.get("next") ?? null));
    } catch (error) {
      if (!mounted.current || getAuthSessionVersion() !== sessionVersion)
        return;
      setFeedback({ message: getErrorMessage(error), tone: "danger" });
    }
  }

  return (
    <form className="space-y-3.5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormField
        error={errors.email?.message}
        id="email"
        label="Email"
        placeholder="you@example.com"
        type="email"
        autoComplete="username"
        disabled={isSubmitting}
        required
        {...register("email")}
      />
      <FormField
        error={errors.password?.message}
        id="password"
        label="Password"
        placeholder="Enter your password"
        type="password"
        autoComplete="current-password"
        disabled={isSubmitting}
        required
        {...register("password")}
      />
      <FormMessage tone={feedback?.tone}>{feedback?.message}</FormMessage>
      <SubmitButton isSubmitting={isSubmitting}>Sign in</SubmitButton>
      <AuthFormLink href="/forgot-password">Forgot password?</AuthFormLink>
      <AuthFormLink href="/register">
        New to TaskFlow? Create an account
      </AuthFormLink>
    </form>
  );
}
