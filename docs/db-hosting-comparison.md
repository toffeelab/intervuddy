# DB 호스팅 선택: AWS RDS vs Supabase vs Neon

> 작성일: 2026-03-20
> 현재 SQLite → managed PostgreSQL 마이그레이션을 위한 비교 분석

## 현재 DB 특성

- 5개 테이블 (job_descriptions, interview_categories, interview_questions, followup_questions, question_keywords)
- **90%+ 읽기** (Server Components), ~10% 쓰기
- Soft delete 패턴, 트랜잭션 사용
- 유저당 데이터: ~6 카테고리, ~50-100 질문, ~100-150 키워드 (소규모)

---

## 비교 분석

### 1. 비용

| 구간                | Neon               | Supabase   | AWS RDS          | Aurora Serverless v2 |
| ------------------- | ------------------ | ---------- | ---------------- | -------------------- |
| 초기 (무료)         | $0 (scale-to-zero) | $0 (500MB) | $0 (12개월 한정) | ~$43/월 최소         |
| 성장기 (1000+ 유저) | $19-69/월          | $25/월     | $15-30/월        | $43-100+/월          |

- **Aurora Serverless v2**: 최소 $43/월 → 초기 단계에 과도함. 탈락
- **Neon**: 진정한 scale-to-zero로 트래픽 없으면 비용 $0
- **Supabase**: 예측 가능한 월 정액. Free → Pro($25) 단계적 업그레이드
- **AWS RDS**: 자체 서버(EC2/ECS) 배포 시 ~$15/월로 가장 저렴

### 2. 성능

| 항목               | Neon                              | Supabase         | AWS RDS                                  |
| ------------------ | --------------------------------- | ---------------- | ---------------------------------------- |
| Cold start         | **300-500ms** (scale-to-zero 시)  | 없음             | 없음                                     |
| Connection pooling | 내장                              | 내장 (Supavisor) | **수동 설정 필요** (RDS Proxy 추가 비용) |
| Edge Runtime 호환  | `@neondatabase/serverless`        | pg 드라이버      | pg 드라이버                              |
| Vercel 통합        | **최상** (Vercel Postgres = Neon) | 좋음             | **미흡** (VPC 설정 필요)                 |

- 면접 Q&A 앱 특성상 500ms cold start는 허용 가능 범위
- AWS RDS는 서버리스(Vercel) 환경에서 연동 복잡. 자체 서버에서는 문제 없음

### 3. 개발자 경험 (DX)

| 항목        | Neon                    | Supabase                   | AWS RDS               |
| ----------- | ----------------------- | -------------------------- | --------------------- |
| 설정 난이도 | 쉬움                    | 쉬움                       | 복잡 (VPC, SG, Proxy) |
| DB 브랜칭   | **고유 기능** (PR별 DB) | 없음                       | 없음                  |
| Admin UI    | 깔끔, 집중적            | **Supabase Studio** (우수) | AWS Console (과도)    |
| ORM 지원    | Drizzle, Prisma 등      | 동일 + supabase-js SDK     | 동일                  |

### 4. 에코시스템

| 기능            | Neon                       | Supabase              | AWS RDS        |
| --------------- | -------------------------- | --------------------- | -------------- |
| 인증            | 없음 (NextAuth/Clerk 별도) | **내장** (GoTrue)     | Cognito (복잡) |
| 파일 스토리지   | 없음                       | **내장** (S3 호환)    | S3 (별도)      |
| 실시간          | 없음                       | **내장**              | 없음           |
| RLS + Auth 연동 | 수동                       | **자동** (auth.uid()) | 수동           |

### 5. 리스크

| 항목           | Neon               | Supabase                            | AWS RDS        |
| -------------- | ------------------ | ----------------------------------- | -------------- |
| 벤더 락인      | 낮음 (표준 PG)     | 낮음~중간 (Auth/SDK 의존)           | 낮음           |
| 성숙도         | 2021~ (가장 신생)  | 2020~ (빠르게 성장)                 | 2009~ (검증됨) |
| 오픈소스       | 스토리지 엔진 독점 | **코어 오픈소스** (셀프호스팅 가능) | 해당 없음      |
| 서비스 종료 시 | pg_dump로 이전     | 셀프호스팅 전환 가능                | pg_dump로 이전 |

---

## 결정: 단계적 마이그레이션 전략

### Phase 1: MVP/초기 — Vercel + Neon

**목표:** 최소 비용으로 빠르게 런칭, 유저 검증

| 항목 | 선택                                             |
| ---- | ------------------------------------------------ |
| 배포 | Vercel (인프라 관리 제로)                        |
| DB   | Neon Free → Launch ($19/월)                      |
| ORM  | Drizzle ORM (SQLite ↔ PostgreSQL 듀얼 지원)      |
| 인증 | NextAuth/Auth.js (Neon과 독립적, 이후 이전 용이) |

**이 단계에서 얻는 것:**

- Scale-to-zero로 비용 $0 (트래픽 없을 때)
- DB 브랜칭으로 PR별 독립 DB 환경
- Vercel 네이티브 통합 (설정 최소)
- Cold start(300-500ms)는 초기 유저 규모에서 무시 가능

**예상 비용:**

- Vercel Hobby: $0 / Pro: $20/월
- Neon: $0~19/월
- **총: $0~39/월**

### Phase 2: 성장기 — 모노레포 + 백엔드 분리 + AWS RDS

**전환 시점:** 유저/트래픽 증가로 Neon 비용 상승, 백엔드 로직 복잡화 시

| 항목 | 선택                                 |
| ---- | ------------------------------------ |
| 배포 | AWS (ECS/EC2) + 별도 백엔드 서버     |
| DB   | AWS RDS PostgreSQL (~$15/월~)        |
| 구조 | 모노레포 (프론트 + 백엔드 분리)      |
| 인증 | 기존 NextAuth 유지 또는 Cognito 전환 |

**전환이 수월한 이유:**

1. **Drizzle ORM** → DB 드라이버만 교체, 쿼리 로직 동일
2. **표준 PostgreSQL** → Neon에서 `pg_dump` → RDS로 import (데이터 이전 간단)
3. **NextAuth** → DB adapter만 변경 (연결 문자열 교체)
4. **data-access 추상화 레이어** → 기존 패턴 유지, 연결 설정만 변경

**예상 비용:**

- AWS EC2/ECS: $10~30/월 (t4g.micro/small)
- RDS: $15/월~
- **총: $25~45/월** (트래픽 대비 가성비 우수)

### 전환 체크리스트 (Phase 1 → 2)

- [ ] 모노레포 구성 (turborepo/nx)
- [ ] 백엔드 서비스 분리 (API routes → 독립 서버)
- [ ] RDS 인스턴스 생성 + 스키마 마이그레이션
- [ ] Neon → RDS 데이터 이전 (`pg_dump`/`pg_restore`)
- [ ] Drizzle 연결 설정 변경 (환경변수만 교체)
- [ ] DNS/네트워크 설정
- [ ] Vercel → AWS 프론트엔드 배포 전환 (선택)

---

## SQLite → PostgreSQL 마이그레이션 시 변경 범위

**수정 필요 파일:**

| 파일                         | 변경 내용                                  |
| ---------------------------- | ------------------------------------------ |
| `src/db/index.ts`            | better-sqlite3 → pg Pool 또는 Drizzle 연결 |
| `src/db/schema.ts`           | PostgreSQL DDL 또는 Drizzle 스키마로 변환  |
| `src/data-access/*.ts` (6개) | 모든 함수 async 전환                       |
| Server Components            | data-access 호출에 `await` 추가            |
| `src/test/helpers/db.ts`     | 테스트 DB 설정 변경                        |

**권장 ORM:** Drizzle ORM (아래 비교 분석 참조)

---

## ORM 비교: Drizzle vs Prisma

> 출처: [Prisma 공식 비교](https://www.prisma.io/docs/orm/more/comparisons/prisma-and-drizzle), [Drizzle + Prisma Postgres](https://orm.drizzle.team/docs/connect-prisma-postgres)

### 설계 철학의 차이

|             | Drizzle                     | Prisma                    |
| ----------- | --------------------------- | ------------------------- |
| 철학        | "SQL을 알면 Drizzle을 안다" | "올바른 것을 쉽게 만든다" |
| 추상화 수준 | SQL 위의 얇은 래퍼          | 높은 수준의 추상화 API    |
| 대상        | SQL에 익숙한 개발자         | SQL 숙련도가 다양한 팀    |

### 항목별 비교

#### 1. 스키마 정의

**Drizzle** — TypeScript 코드로 정의:

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }),
  email: varchar('email', { length: 256 }).unique(),
});
```

**Prisma** — 전용 DSL(`.prisma` 파일)로 정의:

```prisma
model User {
  id    Int     @id @default(autoincrement())
  name  String?
  email String  @unique
  posts Post[]
}
```

| 항목      | Drizzle                       | Prisma                                   |
| --------- | ----------------------------- | ---------------------------------------- |
| 언어      | TypeScript (별도 문법 불필요) | Prisma Schema Language (별도 학습 필요)  |
| 타입 생성 | 스키마에서 자동 추론          | `prisma generate` 명령 필요              |
| 가독성    | TS에 익숙하면 자연스러움      | **비개발자도 읽기 쉬운 선언적 문법**     |
| ERD 생성  | 별도 도구 필요                | 에코시스템 지원 (`prisma-erd-generator`) |

#### 2. 쿼리 API & 관계(Relations)

**Prisma가 강한 부분 — 관계 처리:**

```typescript
// Prisma: 가상 관계 필드로 직관적 데이터 탐색
const posts = await prisma.post.findMany({
  include: { author: true },
});

// Prisma: 중첩 쓰기 (관련 레코드 동시 생성/수정)
const user = await prisma.user.create({
  data: {
    name: 'Nilu',
    posts: { create: { title: 'First Post' } }, // 관계 레코드 동시 생성
  },
});

// Prisma: 관계 필터 (관련 레코드 조건으로 필터링)
const users = await prisma.user.findMany({
  where: { posts: { some: { published: true } } },
});
```

```typescript
// Drizzle: 관계 조회 (유사한 구문)
const posts = await db.query.posts.findMany({
  with: { author: true },
});

// Drizzle: 뮤테이션은 SQL 스타일
const user = await db.insert(users).values({
  name: 'Nilu',
  email: 'nilu@prisma.io',
});
// → 관련 레코드는 별도 insert 필요
```

**Drizzle이 강한 부분 — SQL 표현력:**

```typescript
// Drizzle: 복잡한 서브쿼리를 query builder 내에서 표현
const result = await db
  .select({
    id: categories.id,
    name: categories.name,
    questionCount: sql<number>`COUNT(${questions.id})`,
  })
  .from(categories)
  .leftJoin(questions, eq(questions.categoryId, categories.id))
  .groupBy(categories.id);

// Drizzle: COALESCE, CASE WHEN 등 SQL 함수 자유 사용
const order = sql`COALESCE(
  (SELECT MAX(display_order) + 1 FROM ${questions}
   WHERE category_id = ${categoryId}), 0)`;
```

| 항목                      | Drizzle                        | Prisma                           |
| ------------------------- | ------------------------------ | -------------------------------- |
| 관계 조회                 | `with: { author: true }`       | `include: { author: true }`      |
| 중첩 쓰기 (Nested writes) | 불가 (별도 insert 필요)        | **지원** (관련 레코드 동시 생성) |
| 관계 필터                 | JOIN + WHERE로 수동 구현       | **`some`, `every`, `none` 내장** |
| Junction 테이블           | 수동 관리                      | **암묵적 처리**                  |
| JOIN + 집계               | **query builder로 자연스럽게** | `_count`로 제한적 지원           |
| 서브쿼리 in VALUES        | **`sql` 헬퍼로 가능**          | `$queryRaw` 필수                 |
| COALESCE + CASE WHEN      | **`sql` 헬퍼로 가능**          | `$queryRaw` 필수                 |

#### 3. 필터링 API

| 항목          | Drizzle                         | Prisma                                        |
| ------------- | ------------------------------- | --------------------------------------------- |
| 문자열 검색   | `like`, `ilike` (DB 방언 의존)  | `contains`, `startsWith`, `endsWith` (추상화) |
| 대소문자 구분 | DB별로 다름 (`like` vs `ilike`) | `mode: 'insensitive'` 옵션으로 통일           |
| 접근 방식     | SQL 연산자를 그대로 노출        | **DB 차이를 추상화해서 통일된 API**           |

#### 4. 타입 안전성

Prisma 공식 문서의 주장:

> "Drizzle은 타입 안전성의 인상을 준다. 그러나 쿼리 결과에만 타입 정보가 있다. Drizzle로 유효하지 않은 쿼리를 작성할 수 있다."

| 항목               | Drizzle                                           | Prisma                                    |
| ------------------ | ------------------------------------------------- | ----------------------------------------- |
| 쿼리 결과 타입     | 타입 안전                                         | 타입 안전                                 |
| 쿼리 작성 시 검증  | **일부 유효하지 않은 쿼리 허용** (Prisma 측 주장) | **생성된 타입으로 컴파일 타임 검증**      |
| `sql` 헬퍼 사용 시 | 타입 안전성 약화 (문자열 기반)                    | TypedSQL(`.sql` 파일)로 타입 안전 raw SQL |

**참고:** Prisma는 `$queryRaw` 대안으로 **TypedSQL** 기능을 제공. `.sql` 파일에 쿼리를 작성하면 타입 안전성을 유지한 채 raw SQL 사용 가능.

#### 5. 멀티 DB 지원 (SQLite ↔ PostgreSQL)

| 항목                      | Drizzle                          | Prisma                                     |
| ------------------------- | -------------------------------- | ------------------------------------------ |
| SQLite + PG 동시 지원     | **동일 스키마, 드라이버만 교체** | `provider` 변경 + `prisma generate` 재실행 |
| 로컬 SQLite / 프로덕션 PG | 드라이버 import만 변경           | 스키마 파일 수정 또는 분리 필요            |
| Phase 1→2 전환 영향       | **최소** (연결 설정만)           | 스키마 재정의 + client 재생성              |

**결론:** SQLite → Neon → RDS 단계적 전환에서 **Drizzle이 확실히 유리**.

#### 6. 성능 (서버리스 환경)

| 항목            | Drizzle         | Prisma                             |
| --------------- | --------------- | ---------------------------------- |
| 번들 크기       | ~50KB (경량)    | ~2MB+ (Prisma Engine 포함)         |
| Cold start 영향 | 거의 없음       | Prisma Engine 초기화 오버헤드 있음 |
| 쿼리 실행       | SQL로 직접 매핑 | Prisma Engine이 중간 변환          |
| 서버리스 적합성 | **최적**        | Prisma Accelerate로 보완 가능      |

**Prisma의 대응:** Prisma Accelerate(글로벌 캐시 + connection pooling 서비스)로 서버리스 성능 문제 보완 가능. 단, 추가 서비스 의존.

#### 7. 에코시스템 & 부가 기능

| 항목              | Drizzle                    | Prisma                                            |
| ----------------- | -------------------------- | ------------------------------------------------- |
| Admin GUI         | 없음 (Drizzle Studio 베타) | **Prisma Studio** (성숙)                          |
| DB 관리 서비스    | 없음                       | **Prisma Postgres** (서버리스 DB)                 |
| 캐시/풀링 서비스  | 없음                       | **Prisma Accelerate** (글로벌 캐시 + 풀링)        |
| 실시간 구독       | 없음                       | **Prisma Pulse** (DB 변경 이벤트 스트리밍)        |
| Client Extensions | 없음                       | **지원** (커스텀 동작 추가, 팀 공유)              |
| 프레임워크 통합   | Next.js, Nuxt 등           | RedwoodJS, KeystoneJS, Wasp, t3 등 **더 광범위**  |
| 커뮤니티 도구     | 성장 중                    | Zod 생성기, tRPC 생성기, GraphQL 타입 등 **풍부** |

#### 8. 팀 협업

Prisma 공식 문서가 강조하는 팀 관점:

| 항목                | Drizzle                | Prisma                         |
| ------------------- | ---------------------- | ------------------------------ |
| SQL 비전문가 온보딩 | SQL 학습 필요          | **SQL 몰라도 사용 가능**       |
| 스키마 공유/이해    | TS 코드 읽기 필요      | **선언적 DSL로 누구나 이해**   |
| 코드 리뷰           | SQL 이해해야 리뷰 가능 | **추상화된 API로 패턴 일관**   |
| 지식 병목           | SQL 전문가 의존 가능성 | **팀 전체가 백엔드 기여 가능** |

> Prisma 측 주장: "Drizzle은 SQL을 아는 단독 개발자에게 좋을 수 있다. 하지만 팀이 되면, Prisma가 속도를 늦추는 마찰과 지식 리스크를 제거한다."

#### 9. DB 지원 범위

| DB            | Drizzle  | Prisma   |
| ------------- | -------- | -------- |
| PostgreSQL    | 지원     | 지원     |
| MySQL         | 지원     | 지원     |
| SQLite        | 지원     | 지원     |
| CockroachDB   | 미지원   | **지원** |
| SQL Server    | 미지원   | **지원** |
| MongoDB       | 미지원   | **지원** |
| Cloudflare D1 | **지원** | 미지원   |
| bun:sqlite    | **지원** | 미지원   |

### 흥미로운 조합: Drizzle + Prisma Postgres

Drizzle 공식 문서에 따르면, **Prisma Postgres**(서버리스 DB)를 Drizzle의 query builder로 연결할 수 있음.

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });
```

즉, Prisma의 인프라(서버리스 DB, cold start 없음) + Drizzle의 쿼리 빌더를 조합 가능. 단, Prisma Accelerate(캐시)나 Pulse(실시간)는 Prisma Client 전용이라 Drizzle에서 사용 불가.

### 현재 프로젝트 쿼리의 ORM 적합도

| 쿼리 패턴                     | Drizzle                     | Prisma                           | 비고        |
| ----------------------------- | --------------------------- | -------------------------------- | ----------- |
| LEFT JOIN + COUNT + GROUP BY  | **높음** (query builder)    | 중간 (`_count` 제한적)           |             |
| COALESCE(MAX()+1, 0) 서브쿼리 | **높음** (`sql` 헬퍼)       | 낮음 (`$queryRaw` 또는 TypedSQL) | 핵심 차이   |
| CASE WHEN in WHERE/VALUES     | **높음** (`sql.case()`)     | 낮음 (`$queryRaw` 또는 TypedSQL) | 핵심 차이   |
| 동적 IN 배치 로딩             | **높음** (`inArray`)        | **높음** (`in`)                  | 동등        |
| 동적 부분 UPDATE              | **높음** (`.set()`)         | **높음** (`update`)              | 동등        |
| 멀티 스텝 트랜잭션            | **높음** (`db.transaction`) | **높음** (`$transaction`)        | 동등        |
| 중첩 쓰기 (import 로직)       | 낮음 (수동 insert)          | **높음** (nested create)         | Prisma 유리 |
| 관계 필터링                   | 중간 (JOIN 수동)            | **높음** (`some/every/none`)     | Prisma 유리 |
| **전체 적합도**               | **7.5/10**                  | **6/10**                         |             |

### 최종 판단

#### 이 프로젝트에서는 Drizzle 권장

**Drizzle을 선택하는 이유:**

1. **쿼리 표현력**: COALESCE+서브쿼리, CASE WHEN 패턴이 핵심 로직에 다수 존재. Drizzle은 query builder로 처리 가능, Prisma는 raw SQL(또는 TypedSQL)로 빠져야 함
2. **멀티 DB 전환**: SQLite → Neon → RDS 단계적 전환 시 드라이버만 교체. Prisma는 매 전환마다 스키마+client 재생성 필요
3. **서버리스 번들**: ~50KB vs ~2MB+. Vercel + Neon 환경에서 cold start 불이익 없음
4. **SQL 친화적**: 현재 raw SQL 기반 data-access 패턴과 사고방식이 유사 → 마이그레이션 학습 비용 낮음
5. **1인 개발**: SQL에 익숙한 개발자가 단독으로 진행 → Prisma의 팀 협업 이점이 적용되지 않음

#### Prisma가 더 나은 선택이 되는 시점

- **팀 확장 시**: SQL 비전문가가 합류하면 Prisma의 추상화 API + 선언적 스키마가 온보딩에 유리
- **관계 복잡도 증가 시**: 중첩 쓰기, 관계 필터가 많아지면 Prisma의 관계 API가 보일러플레이트를 크게 줄임
- **부가 서비스 필요 시**: Prisma Studio(데이터 GUI), Accelerate(캐시), Pulse(실시간)가 필요한 경우
- **에코시스템 활용 시**: tRPC 생성기, Zod 스키마 생성기, GraphQL 타입 등 Prisma 에코시스템이 필요한 경우

#### 판단 요약

| 기준                             | 이 프로젝트 상황 | 유리한 ORM    |
| -------------------------------- | ---------------- | ------------- |
| 복잡한 SQL 표현 (COALESCE, CASE) | 핵심 로직에 다수 | **Drizzle**   |
| 멀티 DB 전환 (SQLite→PG→RDS)     | 필수 요구사항    | **Drizzle**   |
| 서버리스 성능 (Vercel+Neon)      | 배포 환경 확정   | **Drizzle**   |
| 1인 개발 + SQL 숙련              | 현재 상황        | **Drizzle**   |
| 관계 데이터 처리                 | 중간 복잡도      | Prisma (소폭) |
| 에코시스템/부가 서비스           | 현재 불필요      | Prisma        |
| 팀 협업/온보딩                   | 현재 해당 없음   | Prisma        |
