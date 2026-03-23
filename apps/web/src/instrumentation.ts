export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { purgeAllExpiredItems } = await import('@intervuddy/database');
    const { getDb } = await import('@/db');
    // 서버 시작 시 1회 실행: 만료된 소프트 삭제 항목 영구 삭제
    purgeAllExpiredItems(getDb());
  }
}
