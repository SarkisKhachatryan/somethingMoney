/**
 * Tests for Export Service
 */

import { exportTransactionsToCSV, exportTransactionsToPDF, exportBudgetReportToPDF } from '../../services/exportService.js';
import { dbRun, dbGet } from '../../database.js';

describe('Export Service', () => {
  let testFamilyId;
  let testCategoryId;
  let testUserId;

  beforeAll(async () => {
    // Create test data
    const userResult = await dbRun(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [`exporttest${Date.now()}@example.com`, 'hashed', 'Export Test User']
    );
    testUserId = userResult.lastID;

    const familyResult = await dbRun(
      'INSERT INTO families (name, currency) VALUES (?, ?)',
      ['Export Test Family', 'USD']
    );
    testFamilyId = familyResult.lastID;

    await dbRun(
      'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
      [testFamilyId, testUserId, 'owner']
    );

    const categoryResult = await dbRun(
      'INSERT INTO categories (family_id, name, type) VALUES (?, ?, ?)',
      [testFamilyId, 'Test Category', 'expense']
    );
    testCategoryId = categoryResult.lastID;

    // Create test transactions
    await dbRun(
      'INSERT INTO transactions (family_id, user_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testFamilyId, testUserId, testCategoryId, 'expense', 50.00, 'Test transaction 1', new Date().toISOString().split('T')[0]]
    );

    await dbRun(
      'INSERT INTO transactions (family_id, user_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testFamilyId, testUserId, testCategoryId, 'expense', 75.50, 'Test transaction 2', new Date().toISOString().split('T')[0]]
    );

    // Create test budget
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    await dbRun(
      'INSERT INTO budgets (family_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?)',
      [testFamilyId, testCategoryId, 500, month, year]
    );
  });

  describe('exportTransactionsToCSV', () => {
    test('should export transactions to CSV format', async () => {
      const csv = await exportTransactionsToCSV(testFamilyId, null, null, 'USD');
      
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Date');
      expect(csv).toContain('Type');
      expect(csv).toContain('Category');
      expect(csv).toContain('Amount');
      expect(csv).toContain('Description');
    });

    test('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date().toISOString().split('T')[0];

      const csv = await exportTransactionsToCSV(testFamilyId, startDate.toISOString().split('T')[0], endDate, 'USD');
      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
    });

    test('should handle empty transaction list', async () => {
      // Create family with no transactions
      const emptyFamilyResult = await dbRun(
        'INSERT INTO families (name, currency) VALUES (?, ?)',
        ['Empty Family', 'USD']
      );
      const emptyFamilyId = emptyFamilyResult.lastID;

      const csv = await exportTransactionsToCSV(emptyFamilyId, null, null, 'USD');
      expect(csv).toContain('Date');
      // CSV should have at least header line
      expect(csv.split('\n').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('exportTransactionsToPDF', () => {
    test('should export transactions to PDF', async () => {
      const pdf = await exportTransactionsToPDF(testFamilyId, null, null, 'USD');
      
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(0);
    });

    test('should filter transactions by date range in PDF', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date().toISOString().split('T')[0];

      const pdf = await exportTransactionsToPDF(testFamilyId, startDate.toISOString().split('T')[0], endDate, 'USD');
      expect(Buffer.isBuffer(pdf)).toBe(true);
    });

    test('should handle different currencies in PDF', async () => {
      const pdf = await exportTransactionsToPDF(testFamilyId, null, null, 'EUR');
      expect(Buffer.isBuffer(pdf)).toBe(true);
    });
  });

  describe('exportBudgetReportToPDF', () => {
    test('should export budget report to PDF', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const pdf = await exportBudgetReportToPDF(testFamilyId, month, year, 'USD');
      
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(0);
    });

    test('should handle different currencies in budget PDF', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const pdf = await exportBudgetReportToPDF(testFamilyId, month, year, 'EUR');
      expect(Buffer.isBuffer(pdf)).toBe(true);
    });

    test('should handle budget with no spending', async () => {
      // Create family with budget but no transactions
      const emptyFamilyResult = await dbRun(
        'INSERT INTO families (name, currency) VALUES (?, ?)',
        ['Budget Only Family', 'USD']
      );
      const emptyFamilyId = emptyFamilyResult.lastID;

      const categoryResult = await dbRun(
        'INSERT INTO categories (family_id, name, type) VALUES (?, ?, ?)',
        [emptyFamilyId, 'Budget Category', 'expense']
      );

      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      await dbRun(
        'INSERT INTO budgets (family_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?)',
        [emptyFamilyId, categoryResult.lastID, 300, month, year]
      );

      const pdf = await exportBudgetReportToPDF(emptyFamilyId, month, year, 'USD');
      expect(Buffer.isBuffer(pdf)).toBe(true);
    });
  });
});

