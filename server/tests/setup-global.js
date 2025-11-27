/**
 * Global test setup
 * This runs before all tests
 */

import { initDatabase } from '../database.js';

// Initialize test database before all tests
// This ensures the schema exists in the test database file
beforeAll(async () => {
  try {
    // Initialize the actual database schema
    // Tests use the same database.js module, so we need to ensure schema exists
    await initDatabase();
    console.log('Test database initialized');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}, 30000); // 30 second timeout for database initialization

