import { expect } from '@playwright/test';
import { test, unauthenticatedTest } from '../fixtures/base';
import { LoginPage } from '../pages/login.page';

unauthenticatedTest.describe('비인증 사용자', () => {
  unauthenticatedTest('보호된 페이지 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page).toHaveURL(/\/login/);
  });

  unauthenticatedTest('/study 접근 시 /login으로 리다이렉트', async ({ page }) => {
    await page.goto('/study');
    await expect(page).toHaveURL(/\/login/);
  });

  unauthenticatedTest('로그인 페이지 렌더링', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.googleButton).toBeVisible();
    await expect(loginPage.githubButton).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
  });
});

test.describe('인증된 사용자', () => {
  test('/login 접근 시 /interviews로 리다이렉트', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/interviews/);
  });

  test('/interviews 정상 접근', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
