import fs from 'fs';
import path from 'path';
import { encode } from 'next-auth/jwt';

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret)
    throw new Error('AUTH_SECRET 환경변수가 설정되지 않았습니다. .env.local을 확인하세요.');
  return secret;
}
const STORAGE_STATE_DIR = path.join(__dirname, '..', '.auth');

export interface TestUser {
  id: string;
  name: string;
  email: string;
}

export const TEST_USER_A: TestUser = {
  id: 'e2e-user-a',
  name: 'E2E User A',
  email: 'e2e-a@intervuddy.test',
};

export const TEST_USER_B: TestUser = {
  id: 'e2e-user-b',
  name: 'E2E User B',
  email: 'e2e-b@intervuddy.test',
};

/**
 * Auth.js v5 JWT 토큰을 생성하고 storageState JSON 파일로 저장.
 * Playwright의 storageState 옵션으로 이 파일을 로드하면 인증된 상태가 된다.
 */
export async function createAuthState(user: TestUser): Promise<string> {
  fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
    },
    secret: getAuthSecret(),
    salt: 'authjs.session-token',
  });

  const storageState = {
    cookies: [
      {
        name: 'authjs.session-token',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
        expires: -1,
      },
    ],
    origins: [],
  };

  const filePath = path.join(STORAGE_STATE_DIR, `${user.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(storageState, null, 2));
  return filePath;
}

export function getStorageStatePath(user: TestUser): string {
  return path.join(STORAGE_STATE_DIR, `${user.id}.json`);
}
