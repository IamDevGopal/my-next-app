/**
 * Pages Router fallback shadow.
 *
 * We are an App Router-only application, but Next.js 15 still generates a
 * legacy `_error` static page during build via its bundled pages-router
 * runtime. That bundled template imports `<Html>` from `next/document` and
 * trips the "should not be imported outside of pages/_document" lint
 * because we don't have a `pages/_document.tsx` file at all.
 *
 * Providing this minimal `pages/_error.tsx` (which does NOT import
 * `<Html>`) shadows the bundled default so the legacy fallback renders
 * cleanly. Runtime errors on real pages are still handled by App Router's
 * `error.tsx` and `global-error.tsx`; this file only exists to satisfy
 * the build-time static generation step.
 *
 * Documented Next.js workaround for the App Router + standalone output
 * combination on 15.x. Remove if/when Next.js stops generating the legacy
 * `_error` route for App Router-only projects.
 */
export default function Error({ statusCode }: { statusCode?: number }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        textAlign: "center",
        background: "#f1f5f9",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div>
        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#be123c" }}>
          {statusCode ?? "Error"}
        </p>
        <h1 style={{ marginTop: "0.5rem", fontSize: "1.875rem", color: "#020617" }}>
          {statusCode === 404
            ? "Page not found"
            : "Something went wrong"}
        </h1>
        <a
          href="/login"
          style={{
            marginTop: "1.5rem",
            display: "inline-block",
            padding: "0.5rem 1rem",
            background: "#020617",
            color: "white",
            borderRadius: "0.375rem",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          Back to TaskFlow
        </a>
      </div>
    </main>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode?: number }; err?: { statusCode?: number } }) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};
