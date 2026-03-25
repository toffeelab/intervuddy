import type { Database } from '@intervuddy/database';
import {
  registerTestDbCallbacks,
  createTestDb,
  cleanupTestDb,
  truncateAllTables,
  seedTestCategories,
  seedTestQuestions,
  seedTestJobDescription,
  seedTestSession,
  closeTestPool,
} from '@intervuddy/database/src/test-helpers/db';
import { setDb, resetDb } from '@/db';

// Register callbacks so the database package's test helper
// can inject the test DB into our app-level wrapper
registerTestDbCallbacks({
  onSetDb: (db: Database) => setDb(db),
  onResetDb: () => resetDb(),
});

export {
  createTestDb,
  cleanupTestDb,
  truncateAllTables,
  seedTestCategories,
  seedTestQuestions,
  seedTestJobDescription,
  seedTestSession,
  closeTestPool,
};
