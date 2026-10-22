import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-level route protection for `/dashboard/*`. Tokens themselves live in
 * localStorage (XSS-scoped) so the edge can't see them; we instead read a
 * lightweight `tf.session` cookie that `auth-storage.ts` sets in parallel
 * to every successful token write.
 *
 * Missing hints redirect protected navigation to sign-in. Presence never
 * authenticates a user or blocks public login/recovery/verification pages.
 * The client reconciles stale credentials; the API checks live sessions.
 */
const SESSION_FLAG_COOKIE = "tf.session";

const PROTECTED_PREFIXES = ["/dashboard"];

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
    /**
     * Preserve the intended destination for the sign-in flow.
     */
    if (pathname && pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
