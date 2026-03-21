import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../src/db/schema';
import {
  users,
  jobDescriptions,
  interviewCategories,
  interviewQuestions,
  followupQuestions,
} from '../../src/db/schema';
import { TEST_USER_A, TEST_USER_B } from './auth';

const SYSTEM_USER_ID = 'system';

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

export function getE2EDbUrl(): string {
  return (
    process.env.DATABASE_URL || 'postgresql://intervuddy:intervuddy@localhost:5433/intervuddy_test'
  );
}

export function getE2EDb(): { pool: Pool; db: NodePgDatabase<typeof schema> } {
  if (!pool) {
    pool = new Pool({ connectionString: getE2EDbUrl() });
    db = drizzle(pool, { schema });
  }
  return { pool, db: db! };
}

export async function closeE2EDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export async function seedE2EData(): Promise<void> {
  const { db } = getE2EDb();

  // 기존 데이터 정리 (FK 순서 준수)
  await db.delete(followupQuestions);
  await db.delete(interviewQuestions);
  await db.delete(interviewCategories);
  await db.delete(jobDescriptions);
  await db.delete(schema.accounts);
  await db.delete(schema.verificationTokens);
  await db.delete(users);

  // 사용자 생성
  await db.insert(users).values([
    { id: SYSTEM_USER_ID, name: 'System', email: 'system@intervuddy.internal' },
    { id: TEST_USER_A.id, name: TEST_USER_A.name, email: TEST_USER_A.email },
    { id: TEST_USER_B.id, name: TEST_USER_B.name, email: TEST_USER_B.email },
  ]);

  // 시스템 카테고리 (템플릿)
  await db.insert(interviewCategories).values([
    {
      userId: SYSTEM_USER_ID,
      name: '자기소개/커리어',
      slug: 'self-intro',
      displayLabel: '자기소개',
      icon: '👤',
      displayOrder: 1,
    },
    {
      userId: SYSTEM_USER_ID,
      name: '기술역량',
      slug: 'tech',
      displayLabel: '기술',
      icon: '⚙️',
      displayOrder: 2,
    },
  ]);

  // User A 데이터: 카테고리 + 채용공고 + 질문
  const [catA] = await db
    .insert(interviewCategories)
    .values({
      userId: TEST_USER_A.id,
      name: '자기소개/커리어',
      slug: 'self-intro',
      displayLabel: '자기소개',
      icon: '👤',
      displayOrder: 1,
    })
    .returning({ id: interviewCategories.id });

  const jobs = await db
    .insert(jobDescriptions)
    .values([
      {
        userId: TEST_USER_A.id,
        companyName: '네이버',
        positionTitle: '프론트엔드 시니어',
        status: 'in_progress',
        memo: '웹 플랫폼팀',
      },
      {
        userId: TEST_USER_A.id,
        companyName: '카카오',
        positionTitle: '백엔드 개발자',
        status: 'completed',
      },
      {
        userId: TEST_USER_A.id,
        companyName: '라인',
        positionTitle: '풀스택 엔지니어',
        status: 'archived',
      },
    ])
    .returning({ id: jobDescriptions.id });

  // 질문을 첫 번째 공고(네이버)에 연결
  const naverJobId = jobs[0].id;

  const [questionA] = await db
    .insert(interviewQuestions)
    .values({
      userId: TEST_USER_A.id,
      categoryId: catA.id,
      jdId: naverJobId,
      question: '자기소개를 해주세요',
      answer: '저는 5년차 프론트엔드 개발자입니다.',
      tip: '구체적 수치를 포함하세요',
      keywords: ['자기소개', '경력'],
      displayOrder: 1,
    })
    .returning({ id: interviewQuestions.id });

  await db.insert(followupQuestions).values({
    userId: TEST_USER_A.id,
    questionId: questionA.id,
    question: '가장 어려웠던 프로젝트는?',
    answer: '실시간 통신 시스템 구축',
    displayOrder: 1,
  });

  // User A 공통 질문 (JD 없음 → 학습 모드 "공통 라이브러리"에 표시)
  await db.insert(interviewQuestions).values({
    userId: TEST_USER_A.id,
    categoryId: catA.id,
    question: '본인의 강점은 무엇인가요?',
    answer: '문제 해결 능력과 팀 커뮤니케이션입니다.',
    tip: '구체적 사례를 들어 설명하세요',
    keywords: ['강점', '역량'],
    displayOrder: 2,
  });

  // User B 데이터: 별도 공고 (데이터 격리 검증용)
  await db.insert(jobDescriptions).values({
    userId: TEST_USER_B.id,
    companyName: '토스',
    positionTitle: 'iOS 개발자',
    status: 'in_progress',
  });
}
