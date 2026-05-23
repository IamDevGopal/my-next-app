"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600">Something went wrong!</h1>
          <p className="mt-2 text-slate-600">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
