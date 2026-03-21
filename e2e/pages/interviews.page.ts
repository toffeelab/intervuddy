import { type Page, type Locator } from '@playwright/test';

export class InterviewsPage {
  readonly page: Page;
  readonly addJobButton: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: '채용공고' });
    this.addJobButton = page.getByRole('link', { name: /공고 추가/ });
  }

  async goto() {
    await this.page.goto('/interviews');
  }

  getFilterButton(status: '전체' | '진행중' | '완료' | '보관'): Locator {
    return this.page.getByRole('button', { name: status, exact: true });
  }

  getJobCard(companyName: string): Locator {
    return this.page.locator('div[role="button"]').filter({ hasText: companyName });
  }

  getJobCardMoreButton(companyName: string): Locator {
    return this.getJobCard(companyName).getByTitle('더보기');
  }
}
