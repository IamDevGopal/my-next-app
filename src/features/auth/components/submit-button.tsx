import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children: React.ReactNode;
  isSubmitting: boolean;
}

export function SubmitButton({ children, isSubmitting }: SubmitButtonProps) {
  return (
    <button
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      disabled={isSubmitting}
      type="submit"
    >
      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
