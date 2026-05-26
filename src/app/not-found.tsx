import Link from "next/link";

/**
 * App Router 404 page. Without this file, Next.js 15 falls back to the
 * legacy pages-router `_error` flow during build, which imports `<Html>`
 * from `next/document` and fails the build with
 *   "<Html> should not be imported outside of pages/_document"
 * because we have no `pages/` directory at all.
 *
 * Keep this minimal — branded 404 design can come later as a polish task.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 text-center">
      <p className="text-sm font-semibold text-emerald-700">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        The page you tried to open doesn&rsquo;t exist or has moved.
      </p>
      <Link
        className="mt-6 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        href="/login"
      >
        Back to TaskFlow
      </Link>
    </main>
  );
}
