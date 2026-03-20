import { test, expect } from '../fixtures/base';
import { StudyPage } from '../pages/study.page';

test.describe('학습 모드', () => {
  test('Q&A 카드 목록 렌더링', async ({ page }) => {
    const studyPage = new StudyPage(page);
    await studyPage.goto();

    // 시드 데이터의 질문이 표시되는지 확인
    await expect(page.getByText('자기소개를 해주세요')).toBeVisible();
  });

  test('카테고리 필터링', async ({ page }) => {
    const studyPage = new StudyPage(page);
    await studyPage.goto();

    // 자기소개 카테고리 클릭
    await studyPage.getCategoryButton('자기소개').click();

    // 해당 카테고리 질문만 보이는지 확인
    await expect(page.getByText('자기소개를 해주세요')).toBeVisible();
  });

  test('카드 펼치기/접기', async ({ page }) => {
    const studyPage = new StudyPage(page);
    await studyPage.goto();

    // 카드 클릭 → 답변 표시
    const card = studyPage.getQACard('자기소개를 해주세요');
    await card.click();
    await expect(page.getByText('5년차 프론트엔드 개발자')).toBeVisible();

    // 다시 클릭 → 답변 숨김
    await card.click();
    await expect(page.getByText('5년차 프론트엔드 개발자')).not.toBeVisible();
  });

  test('검색', async ({ page }) => {
    const studyPage = new StudyPage(page);
    await studyPage.goto();

    // 검색어 입력
    await studyPage.searchInput.fill('자기소개');

    // 검색어와 매칭되는 결과 표시 (300ms debounce 고려)
    await page.waitForTimeout(500);
    await expect(page.getByText('자기소개를 해주세요')).toBeVisible();
  });
});
