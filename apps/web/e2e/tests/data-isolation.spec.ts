import { test as base, expect } from '@playwright/test';
import { getStorageStatePath, TEST_USER_A, TEST_USER_B } from '../fixtures/auth';

// User A 브라우저
const testAsUserA = base.extend({
  storageState: async ({}, use) => {
    await use(getStorageStatePath(TEST_USER_A));
  },
});

// User B 브라우저
const testAsUserB = base.extend({
  storageState: async ({}, use) => {
    await use(getStorageStatePath(TEST_USER_B));
  },
});

testAsUserA.describe('데이터 격리', () => {
  testAsUserA('User A는 자신의 공고만 볼 수 있다', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page.getByText('네이버')).toBeVisible();
    await expect(page.getByText('토스')).not.toBeVisible(); // User B 데이터
  });
});

testAsUserB.describe('데이터 격리 (User B)', () => {
  testAsUserB('User B는 자신의 공고만 볼 수 있다', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page.getByText('토스')).toBeVisible();
    await expect(page.getByText('네이버')).not.toBeVisible(); // User A 데이터
  });
});
