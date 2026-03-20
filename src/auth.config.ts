import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

/**
 * Auth.js 설정 — Edge Runtime 호환 부분
 * DrizzleAdapter와 Resend(이메일) provider는 Node.js 전용이므로 여기에 포함하지 않음.
 * proxy.ts(Edge) → auth.config.ts (이 파일)
 * auth.ts(Node.js) → auth.config.ts + DrizzleAdapter + Resend
 */
export default {
  session: { strategy: 'jwt' },
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    GitHub({ allowDangerousEmailAccountLinking: true }),
    // Resend provider는 adapter 필요 → auth.ts(Node.js)에서만 추가
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
    verifyRequest: '/login/verify',
    error: '/login/error',
  },
} satisfies NextAuthConfig;
