"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { verifyEmail } from "../api/auth.api";
import { storeAuthTokens } from "../utils/auth-storage";
import { AuthFormLink } from "./auth-form-link";
import { FormMessage } from "./form-message";
import { getErrorMessage } from "@/lib/http/get-error-message";

type Status = "idle" | "verifying" | "success" | "error";

const MISSING_TOKEN_MESSAGE =
  "No verification token in the link. Open the email link again.";

export function VerifyEmailFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // Derive the initial state from the presence of the token instead of
  // setting it inside a useEffect (which trips react-hooks/set-state-in-effect
  // and also causes an unnecessary extra render).
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState<string | null>(
    token ? null : MISSING_TOKEN_MESSAGE,
  );
  // Guard against the effect firing twice in React 18 strict mode (dev) —
  // verify-email is single-use, so the second call would always fail.
  const startedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (startedRef.current) return;
    startedRef.current = true;

    verifyEmail({ token })
      .then((response) => {
        storeAuthTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        });
        setStatus("success");
        setMessage(
          response.message ??
            `Email verified. Welcome, ${response.data.user.name}.`,
        );
        // Brief pause so the user sees the success state before we navigate.
        const timeout = setTimeout(() => router.replace("/dashboard"), 1200);
        return () => clearTimeout(timeout);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(getErrorMessage(error));
      });
  }, [token, router]);

  if (status === "verifying" || status === "idle") {
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
        <p className="text-sm text-slate-600">
          Redirecting you to your dashboard&hellip;
        </p>
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
