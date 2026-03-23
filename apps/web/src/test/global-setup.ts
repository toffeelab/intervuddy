export default async function globalSetup() {
  return async function teardown() {
    // DB cleanup is handled by packages/database test suite
  };
}
