import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { isDemoEnabled, isGitHubEnabled } from "@/lib/config";
import { prisma } from "@/lib/db";
import { createGuestUser } from "@/server/guest";

const providers: Provider[] = [];

if (isGitHubEnabled()) providers.push(GitHub);

if (isDemoEnabled()) {
  // "Try the demo": each click creates a fresh guest user with a seeded board.
  providers.push(
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {},
      authorize: () => createGuestUser(),
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT sessions: required by the guest (credentials) provider, and they keep
  // auth checks to a cookie read instead of a database query.
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/" },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
