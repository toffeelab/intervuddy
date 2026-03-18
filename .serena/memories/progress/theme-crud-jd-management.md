# 테마/CRUD/JD 관리 구현 진행 상황

## 문서 위치
- **스펙:** `docs/superpowers/specs/2026-03-17-theme-crud-jd-management-design.md`
- **구현 계획:** `docs/superpowers/plans/2026-03-17-theme-crud-jd-management.md`

## 완료된 브랜치

| 브랜치 | PR | 상태 |
|--------|:--:|------|
| `feature/theme-mode-toggle` | #3 | E2E 검증 완료, PR 생성, develop 머지 대기 |
| `feature/interview-schema-v2` | #4 | E2E 검증 완료, PR 생성, develop 머지 대기 |

## 남은 브랜치 (순차 의존)

| 순서 | 브랜치 | 의존 |
|:----:|--------|------|
| 3 | `feature/question-crud-actions` | PR #4 머지 후 develop에서 분기 |
| 4 | `feature/job-description-management` | Branch 3 머지 후 |
| 5 | `feature/soft-delete-and-recovery` | Branch 4 머지 후 |

## 워크플로우 패턴
- **superpowers:subagent-driven-development** 사용
- 각 브랜치: worktree 격리 구현 → 스펙 리뷰 → 코드 품질 리뷰 → E2E 검증 → PR 생성
- pnpm only, Co-Authored-By 제거, PR은 `--base develop`
- worktree에서 에이전트 실행 시 `node_modules` 심링크 필요

## 주의사항
- `data/seed.ts`는 스키마 v2 구조로 변환 완료 (.gitignore 대상)
- Branch 2에서 `interview` → `study` 리네이밍 완료
- 현재 라우트: `/study` (학습), `/interviews/*` (관리 - Branch 3~5에서 구현)
