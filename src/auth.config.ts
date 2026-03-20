import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';

/**
 * Auth.js 설정 — Edge Runtime 호환 부분
 * DrizzleAdapter는 Node.js 전용이므로 여기에 포함하지 않음.
 * proxy.ts(Edge) → auth.config.ts (이 파일)
 * auth.ts(Node.js) → auth.config.ts + DrizzleAdapter
 */
export default {
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
} satisfies NextAuthConfig;
