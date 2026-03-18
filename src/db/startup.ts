import { purgeExpiredItems } from '@/data-access/cleanup';

let hasRun = false;

/** 앱 시작 시 1회 실행. 만료된 소프트 삭제 항목 영구 삭제. */
export function runStartupTasks(): void {
  if (hasRun) return;
  hasRun = true;
  purgeExpiredItems();
}
