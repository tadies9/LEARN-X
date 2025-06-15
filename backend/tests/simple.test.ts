import { setupTests, cleanupTests } from './setup';

describe('Simple Test', () => {
  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await cleanupTests();
  });

  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test string operations', () => {
    const testString = 'Hello World';
    expect(testString).toBeDefined();
    expect(testString.length).toBeGreaterThan(0);
  });
}); 