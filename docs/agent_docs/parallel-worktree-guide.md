# 병렬 작업 및 Worktree 관리

모든 코드 구현은 worktree에서 수행한다. 메인 디렉토리는 develop의 클린 상태를 유지.

## 관련 스킬

- `using-git-worktrees`: worktree 생성 및 격리 환경 설정
- `dispatching-parallel-agents`: 독립 태스크 병렬 실행

## 메인 디렉토리 vs Worktree

| 작업                 | 위치          | 이유                    |
| -------------------- | ------------- | ----------------------- |
| brainstorming / 스펙 | 메인 디렉토리 | 다른 세션에서 참조 가능 |
| 플랜 작성            | 메인 디렉토리 | 구현 세션이 읽어야 함   |
| 코드 구현            | worktree      | 병렬 격리 필수          |

## Worktree 생명주기

1. feature 브랜치 생성 → worktree 생성 (격리 환경)
2. `node_modules` 심링크: `ln -s <메인>/node_modules ./node_modules`
3. 구현 + 테스트 + 커밋 (worktree 내에서)
4. push + PR 생성
5. **PR push 완료 후 즉시 worktree 정리**: `git worktree remove <path>`
6. 이후 PR 수정이 필요하면 feature 브랜치를 직접 체크아웃하여 작업

## 포트 충돌 방지

여러 worktree에서 동시에 dev 서버를 실행할 수 있다.

```bash
# 포트 사용 여부 확인
lsof -i :3000

# 빈 포트로 dev 서버 실행
pnpm dev --port 3001
```

## 검증 방법

- **기능 검증**: Playwright E2E 테스트 작성 + `pnpm test` 통과 필수
- **빌드 검증**: `pnpm build` 성공 필수
- **시각적 확인**: 필요 시 MCP (Playwright/Chrome DevTools)로 스크린샷 확인
