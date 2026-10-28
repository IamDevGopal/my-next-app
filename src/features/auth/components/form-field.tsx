"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function FormField({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const descriptionIds =
    [props["aria-describedby"], hint ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label
        className="text-sm font-semibold tracking-[0.01em] text-slate-800"
        htmlFor={inputId}
      >
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={descriptionIds}
        className={`h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-100 ${className ?? ""}`}
      />
      {hint ? (
        <p id={hintId} className="text-xs leading-5 text-slate-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-rose-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
