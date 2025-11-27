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

    test('should reject export without required parameters', async () => {
      const response = await request(app)
        .get('/api/export/budget/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ familyId })
        // Missing month and year
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

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

