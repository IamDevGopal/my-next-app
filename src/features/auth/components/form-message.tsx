import type { ReactNode } from "react";

type FormMessageTone = "neutral" | "success" | "code";

type FormMessageProps = {
  children: ReactNode;
  tone?: FormMessageTone;
};

const FORM_MESSAGE_CLASSES: Record<FormMessageTone, string> = {
  code: "break-all rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700",
  neutral:
    "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800",
  success: "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800",
};

export function FormMessage({
  children,
  tone = "success",
}: FormMessageProps) {
  return <p className={FORM_MESSAGE_CLASSES[tone]}>{children}</p>;
}
