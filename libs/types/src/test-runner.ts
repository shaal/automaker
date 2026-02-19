/**
 * Test runner types for the test runner functionality
 */

/**
 * Information about an available test runner
 */
export interface TestRunnerInfo {
  /** Unique identifier for the test runner (e.g., 'vitest', 'jest', 'pytest') */
  id: string;
  /** Display name of the test runner (e.g., "Vitest", "Jest", "Pytest") */
  name: string;
  /** CLI command to run all tests */
  command: string;
  /** Optional: CLI command pattern to run a specific test file */
  fileCommand?: string;
}
