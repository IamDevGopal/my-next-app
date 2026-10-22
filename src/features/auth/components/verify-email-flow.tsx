"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { verifyEmail } from "../api/auth.api";
import {
  getAccessToken,
  getAuthSessionVersion,
  storeAuthTokens,
} from "../utils/auth-storage";
import { AuthFormLink } from "./auth-form-link";
import { FormMessage } from "./form-message";
import { getErrorMessage } from "@/lib/http/get-error-message";

type Status = "confirmation" | "verifying" | "success" | "error";

const MISSING_TOKEN_MESSAGE =
  "No verification token in the link. Open the email link again.";

export function VerifyEmailFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? null;
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(
    token ? null : MISSING_TOKEN_MESSAGE,
  );
  /**
   * Strict Mode subscriptions share one single-use request. Each effect
   * still owns its UI cleanup and may not replace a later browser login.
   */
  const startedRef = useRef<{
    token: string;
    version: string;
    accessToken: string | null;
    promise: ReturnType<typeof verifyEmail>;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    if (!startedRef.current || startedRef.current.token !== token) {
      if (getAccessToken() && !confirmed) {
        setStatus("confirmation");
        return;
      }
      startedRef.current = {
        token,
        version: getAuthSessionVersion(),
        accessToken: getAccessToken(),
        promise: verifyEmail({ token }),
      };
    }
    const request = startedRef.current;
    let active = true;
    setStatus("verifying");
    request.promise
      .then((response) => {
        if (!active) return;
        if (
          getAuthSessionVersion() !== request.version ||
          getAccessToken() !== request.accessToken
        ) {
          setStatus("success");
          setMessage(
            "Email verified. Your browser sign-in changed while verification was pending, so it has been preserved. Sign in separately to use the verified account.",
          );
          return;
        }
        storeAuthTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        });
        setStatus("success");
        setMessage(
          response.message ??
            `Email verified. Welcome, ${response.data.user.name}.`,
        );
        router.replace("/dashboard");
      })
      .catch((error) => {
        if (!active) return;
        setStatus("error");
        setMessage(getErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [token, router, confirmed]);

  if (status === "confirmation") {
    return (
      <div className="space-y-4">
        <FormMessage tone="neutral">
          You are already signed in. Verifying this link will replace this
          browser&apos;s login with the account named in the verification email.
        </FormMessage>
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-4 py-2 text-white"
          onClick={() => setConfirmed(true)}
        >
          Verify and sign in to that account
        </button>
        <AuthFormLink href="/dashboard">Keep my current sign-in</AuthFormLink>
      </div>
    );
  }

  if (status === "verifying") {
    return (
      <FormMessage tone="neutral">
        Verifying your email&hellip; this should only take a moment.
      </FormMessage>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-4">
        <FormMessage tone="success">{message}</FormMessage>
        <AuthFormLink href="/dashboard">Open dashboard</AuthFormLink>
        <AuthFormLink href="/login">Sign in</AuthFormLink>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormMessage tone="danger">{message}</FormMessage>
      <AuthFormLink href="/resend-verification">
        Request a new verification link
      </AuthFormLink>
      <AuthFormLink href="/login">Back to login</AuthFormLink>
    </div>
  );
}
