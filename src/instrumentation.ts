import { purgeAllExpiredItems } from '@/data-access/cleanup';

export function register() {
  // 서버 시작 시 1회 실행: 만료된 소프트 삭제 항목 영구 삭제
  purgeAllExpiredItems();
}
