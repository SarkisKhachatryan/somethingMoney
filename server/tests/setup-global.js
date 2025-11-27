/**
 * Global test setup
 * This runs before all tests
 */

import { initDatabase } from '../database.js';

// Initialize test database before all tests
// This ensures the schema exists in the test database file
beforeAll(async () => {
  // Initialize the actual database schema
  // Tests use the same database.js module, so we need to ensure schema exists
  await initDatabase();
});

