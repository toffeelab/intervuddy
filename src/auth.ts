import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth from 'next-auth';
import { getDb } from '@/db';
import { users, accounts, verificationTokens } from '@/db/schema';
import authConfig from './auth.config';

/**
 * Node.js 전용 Auth.js 설정 — DrizzleAdapter 포함
 * Server Components, Server Actions, API Routes에서 사용.
 * Edge Runtime(proxy.ts)에서는 auth.config.ts만 사용.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accountsTable: accounts as any,
    verificationTokensTable: verificationTokens,
  }),
});
