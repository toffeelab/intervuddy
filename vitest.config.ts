import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Load DATABASE_URL from .env.local for tests
function loadLocalEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '.env.local');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key) env[key.trim()] = rest.join('=').trim();
    }
  }
  return env;
}

const localEnv = loadLocalEnv();

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
    globalTeardown: 'src/test/global-teardown.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    // Run DB tests serially to avoid lock contention on the shared test database.
    // fileParallelism: false ensures test files run one at a time (no overlap between files).
    // singleFork: true + pool: 'forks' keeps everything in one process for shared module state.
    pool: 'forks',
    singleFork: true,
    fileParallelism: false,
    maxConcurrency: 1,
    env: {
      DATABASE_URL:
        localEnv.DATABASE_URL ?? 'postgresql://intervuddy:intervuddy@localhost:5433/intervuddy',
    },
  },
});
