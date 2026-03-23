import { type Page, type Locator } from '@playwright/test';

export class StudyPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly toggleAllButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('질문 또는 키워드 검색...');
    this.toggleAllButton = page.getByRole('button', { name: /전체 펼치기|전체 접기/ });
  }

  async goto() {
    await this.page.goto('/study');
  }

  getCategoryButton(categoryName: string): Locator {
    return this.page
      .locator('aside button, [class*="drawer"] button')
      .filter({ hasText: categoryName });
  }

  getQACard(questionText: string): Locator {
    return this.page.locator('div[role="button"], button').filter({ hasText: questionText });
  }
}
