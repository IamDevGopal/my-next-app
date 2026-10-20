"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { getErrorMessage } from "@/lib/http/get-error-message";
import { changeAccountPassword, signOutAllSessions } from "../services/session-actions";
import { changePasswordSchema, logoutAllSchema } from "../schemas/auth.schema";
import { getAuthSessionVersion } from "../utils/auth-storage";
import { FormField } from "./form-field";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

export function SecurityActionsPanel() {
  const router = useRouter();
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const passwordForm = useForm<z.infer<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema) });
  const logoutForm = useForm<z.infer<typeof logoutAllSchema>>({ resolver: zodResolver(logoutAllSchema) });
  const busy = passwordForm.formState.isSubmitting || logoutForm.formState.isSubmitting;

  async function submitPassword(values: z.infer<typeof changePasswordSchema>) {
    const version = getAuthSessionVersion();
    setPasswordError(null);
    try {
      const result = await changeAccountPassword(values.currentPassword, values.newPassword);
      passwordForm.reset();
      if (result.sessionCleared) router.replace("/login");
    } catch (error) {
      if (getAuthSessionVersion() === version) setPasswordError(getErrorMessage(error));
    }
  }

  async function submitLogout(values: z.infer<typeof logoutAllSchema>) {
    const version = getAuthSessionVersion();
    setLogoutError(null);
    try {
      const result = await signOutAllSessions(values.currentPassword);
      logoutForm.reset();
      if (result.sessionCleared) router.replace("/login");
    } catch (error) {
      if (getAuthSessionVersion() === version) setLogoutError(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Change password</h2>
        <p className="mt-2 text-sm text-slate-600">Changing your password signs out every device, including this one. Use 8–128 characters.</p>
        <form className="mt-4 space-y-4" onSubmit={passwordForm.handleSubmit(submitPassword)}>
          <FormField id="change-current-password" label="Current password" type="password" autoComplete="current-password" error={passwordForm.formState.errors.currentPassword?.message} {...passwordForm.register("currentPassword")} />
          <FormField id="change-new-password" label="New password" type="password" autoComplete="new-password" error={passwordForm.formState.errors.newPassword?.message} {...passwordForm.register("newPassword")} />
          <FormField id="change-confirm-password" label="Confirm new password" type="password" autoComplete="new-password" error={passwordForm.formState.errors.confirmPassword?.message} {...passwordForm.register("confirmPassword")} />
          <div aria-live="polite">{passwordError ? <FormMessage tone="danger">{passwordError}</FormMessage> : null}</div>
          <SubmitButton isSubmitting={busy}>Change password and sign out</SubmitButton>
        </form>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Sign out all devices</h2>
        <p className="mt-2 text-sm text-slate-600">Enter your current password to end all sessions. You will also be signed out here.</p>
        <form className="mt-4 space-y-4" onSubmit={logoutForm.handleSubmit(submitLogout)}>
          <FormField id="logout-current-password" label="Current password" type="password" autoComplete="current-password" error={logoutForm.formState.errors.currentPassword?.message} {...logoutForm.register("currentPassword")} />
          <div aria-live="polite">{logoutError ? <FormMessage tone="danger">{logoutError}</FormMessage> : null}</div>
          <SubmitButton isSubmitting={busy}>Sign out all devices</SubmitButton>
        </form>
      </section>
    </div>
  );
}
