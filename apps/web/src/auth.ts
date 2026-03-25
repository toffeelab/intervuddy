import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { users, accounts, verificationTokens } from '@intervuddy/database';
import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { getDb } from '@/db';
import authConfig from './auth.config';

/**
 * Node.js 전용 Auth.js 설정 — DrizzleAdapter + Resend 포함
 * Server Components, Server Actions, API Routes에서 사용.
 * Edge Runtime(proxy.ts)에서는 auth.config.ts만 사용.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Resend({ from: process.env.AUTH_RESEND_FROM ?? 'noreply@intervuddy.com' }),
  ],
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accountsTable: accounts as any,
    verificationTokensTable: verificationTokens,
  }),
});
