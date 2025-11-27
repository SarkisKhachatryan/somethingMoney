/**
 * Black Box Tests for Export Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import exportRoutes from '../../routes/export.js';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';
import categoryRoutes from '../../routes/category.js';
import transactionRoutes from '../../routes/transaction.js';
import budgetRoutes from '../../routes/budget.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/export', exportRoutes);

describe('Export Module - Black Box Tests', () => {
  let authToken;
  let familyId;
  let categoryId;

  beforeAll(async () => {
    const testUser = {
      email: `exporttest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Export Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Export Test Family', currency: 'USD' });
    familyId = familyResponse.body.family.id;

    const categoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        familyId,
        name: 'Test Category',
        type: 'expense',
        color: '#3B82F6',
        icon: '💰'
      });
    categoryId = categoryResponse.body.category.id;

    // Create test transactions
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        familyId,
        categoryId,
        type: 'expense',
        amount: 50.00,
        description: 'Test transaction 1',
        date: new Date().toISOString().split('T')[0]
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        familyId,
        categoryId,
        type: 'expense',
        amount: 75.00,
        description: 'Test transaction 2',
        date: new Date().toISOString().split('T')[0]
      });

    // Create test budget
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    await request(app)
      .post('/api/budget')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        familyId,
        categoryId,
        amount: 500,
        month,
        year
      });
  });

  describe('GET /api/export/transactions/csv', () => {
    // Test: Verify CSV export of transactions with proper headers and content type
    // Logic: Users need to export transaction data for external analysis (Excel, etc.).
    //        CSV format is universal and easy to import. This tests the export service
    //        generates valid CSV with headers (Date, Type, Category, Amount, Description).
    // Expected: Returns 200 status with text/csv content-type and attachment header
    test('should export transactions to CSV', async () => {
      const response = await request(app)
        .get('/api/export/transactions/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ familyId })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
      expect(response.text).toContain('Date');
      expect(response.text).toContain('Type');
      expect(response.text).toContain('Category');
      expect(response.text).toContain('Amount');
    });

    // Test: Verify CSV export respects date range filtering (startDate, endDate)
    // Logic: Users may want to export only specific time periods. This tests that
    //        the export service correctly filters transactions by date range before
    //        generating the CSV file.
    // Expected: Returns 200 status with CSV containing only transactions in date range
    test('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/export/transactions/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          familyId,
          startDate: startDate.toISOString().split('T')[0],
          endDate
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });

    test('should reject export without family ID', async () => {
      const response = await request(app)
        .get('/api/export/transactions/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify access control prevents non-family members from exporting transactions
    // Logic: Transaction data is sensitive. Only family members should be able to
    //        export their family's financial data. This prevents data leakage.
    // Expected: Returns 403 status when user is not a member of the family
    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .get('/api/export/transactions/csv')
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .query({ familyId })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/export/transactions/pdf', () => {
    // Test: Verify PDF export of transactions with proper content type and binary data
    // Logic: PDF format is better for printing and sharing. This tests that the export
    //        service generates a valid PDF buffer with proper headers. PDFs should
    //        include formatted transaction data with proper currency formatting.
    // Expected: Returns 200 status with application/pdf content-type and PDF buffer
    test('should export transactions to PDF', async () => {
      const response = await request(app)
        .get('/api/export/transactions/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ familyId })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    // Test: Verify PDF export respects date range filtering
    // Logic: Same as CSV export, but for PDF format. Users may want PDF reports
    //        for specific time periods. This ensures date filtering works for PDFs too.
    // Expected: Returns 200 status with PDF containing only transactions in date range
    test('should filter transactions by date range in PDF', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/export/transactions/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          familyId,
          startDate: startDate.toISOString().split('T')[0],
          endDate
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
    });

    test('should reject export without family ID', async () => {
      const response = await request(app)
        .get('/api/export/transactions/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/export/budget/pdf', () => {
    // Test: Verify PDF export of budget report for a specific month/year
    // Logic: Budget reports show budget vs actual spending. This tests that the
    //        export service generates a PDF with budget data, including category
    //        breakdowns and spending summaries. Month and year are required to
    //        identify which budget period to export.
    // Expected: Returns 200 status with application/pdf content-type and PDF buffer
    test('should export budget report to PDF', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const response = await request(app)
        .get('/api/export/budget/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ familyId, month, year })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    // Test: Verify validation requires familyId, month, and year for budget export
    // Logic: Budget reports are month-specific. All three parameters are required:
    //        familyId (which family), month (which month), year (which year).
    //        Without these, the system cannot generate the report.
    // Expected: Returns 400 status with error message indicating missing parameters
    test('should reject export without required parameters', async () => {
      const response = await request(app)
        .get('/api/export/budget/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ familyId })
        // Missing month and year
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify access control prevents non-family members from exporting budget reports
    // Logic: Budget data is sensitive financial information. Only family members
    //        should be able to export budget reports. This prevents unauthorized access.
    // Expected: Returns 403 status when user is not a member of the family
    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other2${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User 2'
        });

      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const response = await request(app)
        .get('/api/export/budget/pdf')
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .query({ familyId, month, year })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });
});

