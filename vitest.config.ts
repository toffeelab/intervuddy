import path from 'path';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // 기본 node 환경. 컴포넌트 테스트는 파일 상단에 // @vitest-environment jsdom 사용 (Vitest v4 권장 방식)
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    globalSetup: ['src/test/global-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Run DB tests serially to avoid lock contention on the shared test database.
    // fileParallelism: false ensures test files run one at a time (no overlap between files).
    // singleFork: true + pool: 'forks' keeps everything in one process for shared module state.
    pool: 'forks',
    fileParallelism: false,
    maxConcurrency: 1,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://intervuddy:intervuddy@localhost:5433/intervuddy',
    },
  },
});
