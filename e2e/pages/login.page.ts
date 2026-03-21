import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly googleButton: Locator;
  readonly githubButton: Locator;
  readonly emailInput: Locator;
  readonly magicLinkButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.googleButton = page.getByRole('button', { name: /Google로 계속하기/ });
    this.githubButton = page.getByRole('button', { name: /GitHub로 계속하기/ });
    this.emailInput = page.getByPlaceholder('이메일 주소');
    this.magicLinkButton = page.getByRole('button', { name: /매직 링크 보내기/ });
  }

  async goto() {
    await this.page.goto('/login');
  }
}
