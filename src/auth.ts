import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { getDb } from '@/db';
import { users, accounts, verificationTokens } from '@/db/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accountsTable: accounts as any,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  providers: [
    Google,
    GitHub,
    Resend({ from: process.env.AUTH_RESEND_FROM ?? 'noreply@intervuddy.com' }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isProtected =
        nextUrl.pathname.startsWith('/interviews') || nextUrl.pathname.startsWith('/study');
      if (isProtected && !isLoggedIn) return false;
      if (nextUrl.pathname === '/login' && isLoggedIn) {
        return Response.redirect(new URL('/interviews', nextUrl));
      }
      return true;
    },
  },
  pages: {
    signIn: '/login',
  },
});
