import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-level route protection for `/dashboard/*`. Tokens themselves live in
 * localStorage (XSS-scoped) so the edge can't see them; we instead read a
 * lightweight `tf.session` cookie that `auth-storage.ts` sets in parallel
 * to every successful token write.
 *
 * This is defense-in-depth, not the only check:
 *   - If the cookie is missing, the middleware bounces the user to /login
 *     BEFORE the dashboard JS even loads. No flash-of-protected-content.
 *   - If the cookie is present but stale (tokens cleared via devtools,
 *     server-side session revoked), the dashboard's data fetches will hit
 *     a 401 and the client-side handler will clear state + redirect.
 *
 * The cookie value is meaningless on its own; it cannot grant access on
 * its own and is not used as an auth credential anywhere.
 */
const SESSION_FLAG_COOKIE = "tf.session";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(
    request.cookies.get(SESSION_FLAG_COOKIE)?.value,
  );

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    // Preserve where the user wanted to go so the login form can bounce
    // them back after success.
    if (pathname && pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If already signed in, don't make the user re-see the login form.
  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run on routes that actually need gating. `_next`, `api`, static
  // assets, and the public landing page are excluded — keeps the middleware
  // fast and avoids edge-runtime overhead on every request.
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/resend-verification",
  ],
};
