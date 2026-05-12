import Link from "next/link";
import type { ReactNode } from "react";

type AuthFormLinkProps = {
  children: ReactNode;
  href: string;
};

export function AuthFormLink({ children, href }: AuthFormLinkProps) {
  return (
    <Link
      className="block text-center text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
      href={href}
    >
      {children}
    </Link>
  );
}
