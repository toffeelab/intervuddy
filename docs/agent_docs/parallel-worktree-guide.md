# 병렬 작업 및 Worktree 관리

독립적인 태스크가 2개 이상일 때 superpowers 스킬로 병렬 처리한다.

## 관련 스킬

- `using-git-worktrees`: worktree 생성 및 격리 환경 설정
- `dispatching-parallel-agents`: 독립 태스크 병렬 실행

## 주의 사항

- dev 서버 포트 충돌 방지: `--port 3001`, `--port 3002` 등
- worktree에서 에이전트 실행 시 `node_modules` 심링크 필요: `ln -s <메인>/node_modules ./node_modules`

## Worktree 생명주기

1. feature 브랜치 생성 → worktree 생성 (격리 환경)
2. 구현 + 테스트 + 커밋 (worktree 내에서)
3. push + PR 생성
4. **PR push 완료 후 즉시 worktree 정리**: `git worktree remove <path>`
5. 이후 PR 수정이 필요하면 feature 브랜치를 직접 체크아웃하여 작업
