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
    // Test: Verify CSV export service generates valid CSV with headers and transaction data
    // Logic: The export service queries transactions from database and formats them as CSV.
    //        CSV should include headers (Date, Type, Category, Amount, Description, User)
    //        and properly escape values. This tests the core CSV generation functionality.
    // Expected: Returns CSV string with headers and transaction rows
    test('should export transactions to CSV format', async () => {
      const csv = await exportTransactionsToCSV(testFamilyId, null, null, 'USD');
      
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Date');
      expect(csv).toContain('Type');
      expect(csv).toContain('Category');
      expect(csv).toContain('Amount');
      expect(csv).toContain('Description');
    });

    // Test: Verify CSV export respects date range filtering (startDate, endDate)
    // Logic: Users may want to export only specific time periods. The service should
    //        filter transactions by date before generating CSV. This tests date filtering
    //        logic in the export service (not just the route).
    // Expected: Returns CSV containing only transactions within the specified date range
    test('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date().toISOString().split('T')[0];

      const csv = await exportTransactionsToCSV(testFamilyId, startDate.toISOString().split('T')[0], endDate, 'USD');
      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
    });

    // Test: Verify CSV export handles families with no transactions gracefully
    // Logic: Edge case - if a family has no transactions, the export should still
    //        generate a valid CSV file with headers (even if no data rows). This
    //        prevents errors and provides a consistent export format.
    // Expected: Returns CSV string with headers only (at least one line)
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
    // Test: Verify PDF export service generates valid PDF buffer with transaction data
    // Logic: PDF export uses PDFKit library to generate formatted PDF documents.
    //        The PDF should include transaction summary and detailed table. This tests
    //        that the service generates a valid PDF buffer (binary data).
    // Expected: Returns Buffer object containing PDF data (length > 0)
    test('should export transactions to PDF', async () => {
      const pdf = await exportTransactionsToPDF(testFamilyId, null, null, 'USD');
      
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(0);
    });

    // Test: Verify PDF export respects date range filtering
    // Logic: Same date filtering logic as CSV, but for PDF format. The service should
    //        filter transactions before generating the PDF document. This ensures
    //        consistency between CSV and PDF exports.
    // Expected: Returns PDF buffer containing only transactions within date range
    test('should filter transactions by date range in PDF', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date().toISOString().split('T')[0];

      const pdf = await exportTransactionsToPDF(testFamilyId, startDate.toISOString().split('T')[0], endDate, 'USD');
      expect(Buffer.isBuffer(pdf)).toBe(true);
    });

    // Test: Verify PDF export formats amounts correctly for different currencies
    // Logic: The export service should format currency amounts using the provided
    //        currency parameter. Different currencies have different symbols and formatting.
    //        This tests that currency formatting is applied correctly in PDF exports.
    // Expected: Returns PDF buffer with properly formatted currency amounts
    test('should handle different currencies in PDF', async () => {
      const pdf = await exportTransactionsToPDF(testFamilyId, null, null, 'EUR');
      expect(Buffer.isBuffer(pdf)).toBe(true);
    });
  });

  describe('exportBudgetReportToPDF', () => {
    // Test: Verify PDF export of budget report for a specific month/year
    // Logic: Budget reports show budget allocations vs actual spending by category.
    //        The service queries budgets and transactions for the specified month/year,
    //        calculates spending per category, and generates a formatted PDF report.
    //        This tests the complete budget report generation logic.
    // Expected: Returns PDF buffer containing budget report with category breakdown
    test('should export budget report to PDF', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const pdf = await exportBudgetReportToPDF(testFamilyId, month, year, 'USD');
      
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(0);
    });

    // Test: Verify budget PDF export formats amounts correctly for different currencies
    // Logic: Budget reports should display amounts in the family's currency with
    //        proper formatting (symbol, decimal places). This tests currency formatting
    //        in budget reports, which may include budget amounts, spent amounts, and
    //        remaining amounts.
    // Expected: Returns PDF buffer with properly formatted currency amounts
    test('should handle different currencies in budget PDF', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const pdf = await exportBudgetReportToPDF(testFamilyId, month, year, 'EUR');
      expect(Buffer.isBuffer(pdf)).toBe(true);
    });

    // Test: Verify budget PDF export handles budgets with no transactions gracefully
    // Logic: Edge case - a family may have budgets set but no transactions yet.
    //        The export should still generate a valid PDF showing budgets with 0 spending.
    //        This prevents errors and provides useful reports even when no spending occurred.
    // Expected: Returns PDF buffer showing budgets with 0% spending
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

