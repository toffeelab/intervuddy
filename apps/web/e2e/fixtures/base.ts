import { test as base } from '@playwright/test';
import { getStorageStatePath, TEST_USER_A } from './auth';

/**
 * 인증된 상태의 test fixture.
 * 기본적으로 TEST_USER_A로 로그인된 브라우저를 제공한다.
 */
export const test = base.extend({
  storageState: async ({}, use) => {
    await use(getStorageStatePath(TEST_USER_A));
  },
});

/**
 * 비인증 상태의 test fixture.
 * 인증 리다이렉트 테스트 등에 사용.
 */
export const unauthenticatedTest = base.extend({
  storageState: async ({}, use) => {
    await use({ cookies: [], origins: [] });
  },
});

export { expect } from '@playwright/test';
