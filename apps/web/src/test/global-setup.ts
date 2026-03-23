import { closeTestPool } from './helpers/db';

export default async function globalSetup() {
  return async function teardown() {
    await closeTestPool();
  };
}
