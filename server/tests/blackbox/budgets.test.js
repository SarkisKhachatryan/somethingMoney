/**
 * Black Box Tests for Budgets Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import budgetRoutes from '../../routes/budget.js';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';
import categoryRoutes from '../../routes/category.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budget', budgetRoutes);

describe('Budgets Module - Black Box Tests', () => {
  let authToken;
  let familyId;
  let categoryId;

  beforeAll(async () => {
    const testUser = {
      email: `budgettest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Budget Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Budget Test Family' });
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
  });

  describe('POST /api/budget', () => {
    // Test: Verify successful creation of monthly budget with all required fields
    // Expected: Returns 201 status with budget object containing correct amount, month, and year
    test('should create budget with valid data', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const response = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 500.00,
          month,
          year
        })
        .expect(201);

      expect(response.body).toHaveProperty('budget');
      expect(parseFloat(response.body.budget.amount)).toBe(500.00);
      expect(response.body.budget.month).toBe(month);
      expect(response.body.budget.year).toBe(year);
    });

    // Test: Verify validation rejects budgets missing required fields (amount, month, year)
    // Expected: Returns 400 status with error message
    test('should reject budget with missing required fields', async () => {
      const response = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId
          // Missing amount, month, year
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify validation rejects invalid month values (must be 1-12)
    // Expected: Returns 400 status with error message
    test('should reject budget with invalid month', async () => {
      const response = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 500,
          month: 13, // Invalid month
          year: new Date().getFullYear()
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify validation prevents negative budget amounts
    // Expected: Returns 400 status with error message
    test('should reject budget with negative amount', async () => {
      const response = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: -100,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/budget/family/:familyId', () => {
    beforeEach(async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 300.00,
          month,
          year
        });
    });

    // Test: Verify retrieval of budgets for a specific family and month
    // Expected: Returns 200 status with array of budgets for the specified month/year
    test('should retrieve budgets for family and month', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const response = await request(app)
        .get(`/api/budget/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ month, year })
        .expect(200);

      expect(response.body).toHaveProperty('budgets');
      expect(Array.isArray(response.body.budgets)).toBe(true);
      expect(response.body.budgets.length).toBeGreaterThan(0);
    });

    // Test: Verify month/year filtering returns only budgets for specified period
    // Expected: Returns 200 status with budgets filtered by month and year
    test('should filter budgets by month and year', async () => {
      const nextMonth = new Date().getMonth() + 2;
      const year = new Date().getFullYear();

      // Create budget for next month
      await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 400.00,
          month: nextMonth,
          year
        });

      const currentMonth = new Date().getMonth() + 1;
      const response = await request(app)
        .get(`/api/budget/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ month: currentMonth, year });

      // Should only return budgets for current month
      response.body.budgets.forEach(budget => {
        expect(budget.month).toBe(currentMonth);
      });
    });
  });

  describe('PUT /api/budget/:id', () => {
    let budgetId;

    beforeEach(async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const response = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 250.00,
          month,
          year
        });
      budgetId = response.body.budget.id;
    });

    // Test: Verify successful update of budget amount
    // Expected: Returns 200 status with updated budget containing new amount
    test('should update budget amount', async () => {
      const response = await request(app)
        .put(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 350.00 })
        .expect(200);

      expect(parseFloat(response.body.budget.amount)).toBe(350.00);
    });

    // Test: Verify update fails gracefully for non-existent budget IDs
    // Expected: Returns 404 status with error message
    test('should reject update of non-existent budget', async () => {
      const response = await request(app)
        .put('/api/budget/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 500 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/budget/:id', () => {
    let budgetId;

    beforeEach(async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const response = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 200.00,
          month,
          year
        });
      budgetId = response.body.budget.id;
    });

    // Test: Verify successful deletion of budget and removal from database
    // Expected: Returns 200 status, and budget is no longer retrievable
    test('should delete budget', async () => {
      await request(app)
        .delete(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's deleted
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const getResponse = await request(app)
        .get(`/api/budget/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ month, year });

      const found = getResponse.body.budgets.find(b => b.id === budgetId);
      expect(found).toBeUndefined();
    });
  });
});

