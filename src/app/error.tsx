"use client";

import Link from "next/link";

/**
 * App Router runtime error boundary. Without this, Next.js 15 falls back
 * to the legacy pages-router `/500` static page during build, which
 * imports `<Html>` from `next/document` and fails the build with
 *   "<Html> should not be imported outside of pages/_document"
 * because we have no `pages/` directory at all.
 *
 * `global-error.tsx` only catches errors in the root layout itself; this
 * `error.tsx` catches errors in nested routes/segments. Together they
 * give Next.js full App Router error coverage and stop it from generating
 * the legacy /500 fallback.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 text-center">
      <p className="text-sm font-semibold text-rose-700">Something went wrong</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        We hit an unexpected error
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        {error.message || "Please try again. If the problem persists, sign in again."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          onClick={() => reset()}
          type="button"
        >
          Try again
        </button>
        <Link
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
          href="/login"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
