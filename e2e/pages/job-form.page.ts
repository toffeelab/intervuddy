import { type Page, type Locator } from '@playwright/test';

export class JobFormPage {
  readonly page: Page;
  readonly companyInput: Locator;
  readonly positionInput: Locator;
  readonly memoInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.companyInput = page.getByPlaceholder('예: 카카오');
    this.positionInput = page.getByPlaceholder('예: 프론트엔드 시니어');
    this.memoInput = page.getByPlaceholder('공고에 대한 메모');
    this.submitButton = page.getByRole('button', { name: '생성' });
    this.cancelButton = page.getByRole('button', { name: '취소' });
  }

  async goto() {
    await this.page.goto('/interviews/jobs/new');
  }

  async fillForm(company: string, position: string, memo?: string) {
    await this.companyInput.fill(company);
    await this.positionInput.fill(position);
    if (memo) {
      await this.memoInput.fill(memo);
    }
  }
}
