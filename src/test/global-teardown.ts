import { closeTestPool } from './helpers/db';

export default async function globalTeardown() {
  await closeTestPool();
}
