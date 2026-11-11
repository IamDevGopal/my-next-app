"use client";

import { ChevronDown } from "lucide-react";
import { formatEnum } from "../helpers/task-display.helper";

interface TextFieldProps {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export function TextField({
  error,
  label,
  onChange,
  placeholder,
  value,
}: TextFieldProps) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>
      ) : null}
    </label>
  );
}

export function DateTimeField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100"
        onChange={(event) => onChange(event.target.value)}
        type="datetime-local"
        value={value}
      />
    </label>
  );
}

export function ToggleButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

export function InlineSelect({
  disabled,
  label,
  onChange,
  optionLabels,
  options,
  value,
  wrapperClassName,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  optionLabels?: Record<string, string>;
  options: string[];
  value: string;
  wrapperClassName?: string;
}) {
  return (
    <label
      className={`block min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-500 ${wrapperClassName ?? ""}`}
    >
      {label}
      <div className="relative mt-1">
        <select
          className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabels?.[option] ??
                (option === "ALL" ? "All" : formatEnum(option))}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
  );
}
