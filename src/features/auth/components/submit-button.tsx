import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children: React.ReactNode;
  isSubmitting: boolean;
}

export function SubmitButton({ children, isSubmitting }: SubmitButtonProps) {
  return (
    <button
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#0f766e_0%,_#0f9f8d_58%,_#14b8a6_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,118,110,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_34px_rgba(15,118,110,0.30)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      disabled={isSubmitting}
      type="submit"
    >
      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
