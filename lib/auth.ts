import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

/**
 * NextAuth (Auth.js v5) — magic-link only, no OAuth providers (yet).
 *
 * Session strategy: "database". With the Drizzle adapter wired in, every
 * request hits Postgres for session validation — the cost is one extra
 * query, the benefit is real session revocation (signing out actually
 * invalidates the cookie server-side, and deleted users lose access
 * immediately rather than waiting for a JWT to expire).
 *
 * If you ever want JWT mode for performance (e.g. running on the edge),
 * switch `strategy` to "jwt" AND drop `sessionsTable` from the adapter
 * config — running an adapter with a sessions table you never read is
 * a footgun.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL ?? "hello@ankommen.de",
    }),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check-email",
  },
  session: { strategy: "database" },
  callbacks: {
    // In database session mode the callback receives `user` (the row from
    // the users table), not `token`. Surface the id on session.user so
    // server actions can use it as their tenant key.
    async session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
    // Where to land after sign-in. Honors a same-origin callback URL when
    // present (set by middleware via ?callbackUrl=… or by the form's hidden
    // redirectTo input), otherwise sends the user to /home — which itself
    // redirects to /onboarding for first-time users.
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        /* not a URL — fall through */
      }
      // Default landing instead of `/` so the magic link never drops users
      // back at the marketing landing page.
      return `${baseUrl}/home`;
    },
  },
});
