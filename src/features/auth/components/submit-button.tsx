import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children: React.ReactNode;
  isSubmitting: boolean;
}

export function SubmitButton({ children, isSubmitting }: SubmitButtonProps) {
  return (
    <button
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={isSubmitting}
      type="submit"
    >
      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
