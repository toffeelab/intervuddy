import { closeE2EDb } from './fixtures/seed';

export default async function globalTeardown() {
  await closeE2EDb();
}
