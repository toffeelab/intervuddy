import { type Page, type Locator } from '@playwright/test';

export class JobDetailPage {
  readonly page: Page;
  readonly companyName: Locator;
  readonly importButton: Locator;
  readonly editButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.companyName = page.locator('h2').first();
    this.importButton = page.getByRole('button', { name: /질문 가져오기/ });
    this.editButton = page.getByRole('link', { name: /수정/ });
  }

  async goto(jobId: string) {
    await this.page.goto(`/interviews/jobs/${jobId}`);
  }

  getQuestionRow(questionText: string): Locator {
    return this.page.locator('div').filter({ hasText: questionText }).first();
  }

  getCategorySection(categoryName: string): Locator {
    return this.page.locator('button').filter({ hasText: categoryName });
  }
}
