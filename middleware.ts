import { auth } from "@/lib/auth";

/**
 * Route protection.
 *
 * Anything under /home, /path, /me, /onboarding requires a session. We don't
 * gate /signin or /signin/check-email here — those are the way back in if
 * you're logged out — and we don't gate the api/auth handlers because
 * NextAuth needs them open. The marketing landing (/) is also public.
 */
export default auth((req) => {
  const { auth: session, nextUrl } = req;
  const isLoggedIn = !!session?.user;
  const path = nextUrl.pathname;

  const isProtected =
    path.startsWith("/home") ||
    path.startsWith("/path") ||
    path.startsWith("/me") ||
    path.startsWith("/onboarding");

  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL("/signin", nextUrl);
    // Preserve where they were trying to go so we can bounce them back
    // after the magic link round-trip.
    signInUrl.searchParams.set("callbackUrl", path);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  // Skip Next internals and static files. Match everything else and let the
  // handler above decide what's public.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
