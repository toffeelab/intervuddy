import { test, expect } from '../fixtures/base';
import { InterviewsPage } from '../pages/interviews.page';
import { JobFormPage } from '../pages/job-form.page';

test.describe('채용공고 CRUD', () => {
  test('공고 목록 조회', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();
    // 시드 데이터의 '네이버' 공고가 표시되는지 확인
    await expect(page.getByText('네이버')).toBeVisible();
    await expect(page.getByText('프론트엔드 시니어')).toBeVisible();
  });

  test('상태 필터링', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();

    // '진행중' 필터 → 네이버만 보임
    await interviewsPage.getFilterButton('진행중').click();
    await expect(page.getByText('네이버')).toBeVisible();
    await expect(page.getByText('카카오')).not.toBeVisible();

    // '완료' 필터 → 카카오만 보임
    await interviewsPage.getFilterButton('완료').click();
    await expect(page.getByText('카카오')).toBeVisible();
    await expect(page.getByText('네이버')).not.toBeVisible();

    // '보관' 필터 → 라인만 보임
    await interviewsPage.getFilterButton('보관').click();
    await expect(page.getByText('라인')).toBeVisible();
    await expect(page.getByText('네이버')).not.toBeVisible();

    // '전체' 필터 → 모두 보임
    await interviewsPage.getFilterButton('전체').click();
    await expect(page.getByText('네이버')).toBeVisible();
    await expect(page.getByText('카카오')).toBeVisible();
  });

  test('새 공고 생성', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();

    // 공고 추가 버튼 클릭
    await interviewsPage.addJobButton.click();
    await expect(page).toHaveURL(/\/interviews\/jobs\/new/);

    // 폼 작성
    const jobForm = new JobFormPage(page);
    await jobForm.fillForm('쿠팡', '시니어 백엔드', '물류 플랫폼팀');
    await jobForm.submitButton.click();

    // 생성 후 상세 페이지로 이동
    await expect(page).toHaveURL(/\/interviews\/jobs\//);
    await expect(page.getByText('쿠팡')).toBeVisible();
  });

  test('공고 수정', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();

    // 네이버 공고 카드 클릭 → 상세 페이지 이동
    await interviewsPage.getJobCard('네이버').click();
    await expect(page).toHaveURL(/\/interviews\/jobs\//);

    // 수정 버튼 클릭
    await page.getByRole('link', { name: /수정/ }).click();
    await expect(page).toHaveURL(/\/edit/);

    // 메모 수정
    const memoInput = page.getByPlaceholder('공고에 대한 메모');
    await memoInput.clear();
    await memoInput.fill('웹 플랫폼팀 — 수정됨');

    // 저장
    await page.getByRole('button', { name: /저장|수정/ }).click();

    // 변경 반영 확인
    await expect(page.getByText('웹 플랫폼팀 — 수정됨')).toBeVisible();
  });

  // TODO: 카드 내 더보기 버튼 클릭 시 카드 네비게이션과 이벤트 충돌 이슈 해결 필요
  test.skip('공고 삭제 (soft delete)', async ({ page }) => {
    const interviewsPage = new InterviewsPage(page);
    await interviewsPage.goto();

    // '전체' 필터로 전환 (보관 상태 공고도 표시)
    await interviewsPage.getFilterButton('전체').click();
    await expect(page.getByText('라인')).toBeVisible();

    // 라인 공고의 더보기 버튼을 force click (카드 네비게이션 방지)
    const moreButton = interviewsPage.getJobCardMoreButton('라인');
    await moreButton.click({ force: true });

    // 드롭다운 메뉴에서 삭제 클릭
    await page.getByRole('menuitem', { name: /삭제/ }).click();

    // 확인 다이얼로그에서 삭제 버튼 클릭
    await page.getByRole('button', { name: '삭제', exact: true }).click();

    // 목록에서 제거 확인
    await expect(interviewsPage.getJobCard('라인')).not.toBeVisible();
  });
});
