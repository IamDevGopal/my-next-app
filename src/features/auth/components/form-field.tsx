interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, ...props }: FormFieldProps) {
  return (
    <div className="space-y-2.5">
      <label className="text-sm font-semibold tracking-[0.01em] text-slate-800" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 text-sm text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        {...props}
      />
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
