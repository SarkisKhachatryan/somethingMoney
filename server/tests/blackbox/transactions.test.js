/**
 * Black Box Tests for Transactions Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import transactionRoutes from '../../routes/transaction.js';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';
import categoryRoutes from '../../routes/category.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);

describe('Transactions Module - Black Box Tests', () => {
  let authToken;
  let familyId;
  let categoryId;
  let userId;

  beforeAll(async () => {
    // Setup: Register user, create family, create category
    const testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Family' });
    
    familyId = familyResponse.body.family.id;

    const categoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        familyId,
        name: 'Groceries',
        type: 'expense',
        color: '#3B82F6',
        icon: '🛒'
      });
    
    categoryId = categoryResponse.body.category.id;
  });

  describe('POST /api/transactions', () => {
    test('should create expense transaction with valid data', async () => {
      const transaction = {
        familyId,
        categoryId,
        type: 'expense',
        amount: 50.00,
        description: 'Weekly groceries',
        date: new Date().toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transaction)
        .expect(201);

      expect(response.body).toHaveProperty('transaction');
      expect(response.body.transaction.amount).toBe('50.00');
      expect(response.body.transaction.type).toBe('expense');
      expect(response.body.transaction.description).toBe('Weekly groceries');
    });

    test('should create income transaction', async () => {
      // Create income category first
      const incomeCategory = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Salary',
          type: 'income',
          color: '#10b981',
          icon: '💰'
        });

      const transaction = {
        familyId,
        categoryId: incomeCategory.body.category.id,
        type: 'income',
        amount: 3000.00,
        description: 'Monthly salary',
        date: new Date().toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transaction)
        .expect(201);

      expect(response.body.transaction.type).toBe('income');
      expect(response.body.transaction.amount).toBe('3000.00');
    });

    test('should reject transaction with missing required fields', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId
          // Missing type, amount, date
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject transaction with invalid category type mismatch', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId, // This is an expense category
          type: 'income', // But trying to use as income
          amount: 100,
          date: new Date().toISOString().split('T')[0]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject transaction without authentication', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          familyId,
          categoryId,
          type: 'expense',
          amount: 50,
          date: new Date().toISOString().split('T')[0]
        })
        .expect(401);
    });
  });

  describe('GET /api/transactions/family/:familyId', () => {
    beforeEach(async () => {
      // Create a test transaction
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          type: 'expense',
          amount: 25.50,
          description: 'Test transaction',
          date: new Date().toISOString().split('T')[0]
        });
    });

    test('should retrieve all transactions for family', async () => {
      const response = await request(app)
        .get(`/api/transactions/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThan(0);
    });

    test('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date().toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/transactions/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate
        })
        .expect(200);

      expect(response.body.transactions).toBeDefined();
    });

    test('should filter transactions by type', async () => {
      const response = await request(app)
        .get(`/api/transactions/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'expense' })
        .expect(200);

      response.body.transactions.forEach(transaction => {
        expect(transaction.type).toBe('expense');
      });
    });

    test('should reject access for non-family member', async () => {
      // Create another user
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .get(`/api/transactions/family/${familyId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/transactions/:id', () => {
    let transactionId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          type: 'expense',
          amount: 100.00,
          description: 'Original description',
          date: new Date().toISOString().split('T')[0]
        });
      transactionId = response.body.transaction.id;
    });

    test('should update transaction amount', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 150.00 })
        .expect(200);

      expect(response.body.transaction.amount).toBe('150.00');
    });

    test('should update transaction description', async () => {
      const response = await request(app)
        .put(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(response.body.transaction.description).toBe('Updated description');
    });

    test('should reject update of non-existent transaction', async () => {
      const response = await request(app)
        .put('/api/transactions/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 200 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    let transactionId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          type: 'expense',
          amount: 75.00,
          date: new Date().toISOString().split('T')[0]
        });
      transactionId = response.body.transaction.id;
    });

    test('should delete transaction', async () => {
      await request(app)
        .delete(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/transactions/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const found = getResponse.body.transactions.find(t => t.id === transactionId);
      expect(found).toBeUndefined();
    });

    test('should reject delete of non-existent transaction', async () => {
      const response = await request(app)
        .delete('/api/transactions/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});

