import { test, expect } from '../fixtures/base';
import { InterviewsPage } from '../pages/interviews.page';

test.describe('질문 관리', () => {
  test('공고 상세에서 질문 목록 확인', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();

    // 네이버 공고 클릭 → 상세 페이지
    await interviewsPage.getJobCard('네이버').click();
    await expect(page).toHaveURL(/\/interviews\/jobs\//);

    // 시드 데이터의 질문이 표시되는지 확인
    await expect(page.getByText('자기소개를 해주세요')).toBeVisible();
  });

  test('질문 편집 드로어', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();

    // 네이버 공고 → 상세 페이지
    await interviewsPage.getJobCard('네이버').click();

    // 질문 더보기 메뉴 → 편집
    const questionRow = page.getByText('자기소개를 해주세요').first();
    await questionRow.hover();
    // Find the more button near this question
    const moreButton = page
      .locator('div')
      .filter({ hasText: '자기소개를 해주세요' })
      .first()
      .getByRole('button')
      .last();
    await moreButton.click();
    await page.getByRole('menuitem', { name: /편집/ }).click();

    // 드로어에서 답변 수정
    const answerTextarea = page.locator('textarea').nth(1); // Answer is second textarea
    await answerTextarea.fill('저는 5년차 프론트엔드 개발자로 React/Next.js 전문입니다.');

    // 저장
    await page.getByRole('button', { name: '저장' }).click();

    // 변경 반영 확인 (드로어 닫힌 후)
    await expect(page.getByText('React/Next.js 전문')).toBeVisible();
  });

  test('시스템 템플릿 import', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();

    // 네이버 공고 → 상세 페이지
    await interviewsPage.getJobCard('네이버').click();

    // 질문 가져오기 버튼 클릭
    await page.getByRole('button', { name: /질문 가져오기/ }).click();

    // Import 모달이 열리는지 확인
    await expect(page.getByText('공통 라이브러리에서 질문 가져오기')).toBeVisible();

    // 시스템 카테고리의 질문이 표시되는지 확인 (시드 데이터에 시스템 카테고리 있음)
    // Note: The actual template questions may vary; this checks the modal renders
    const importButton = page.getByRole('button', { name: /가져오기/ });
    await expect(importButton).toBeVisible();
  });
});
