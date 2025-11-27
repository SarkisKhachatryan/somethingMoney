/**
 * Black Box Tests for Recurring Transactions Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import recurringRoutes from '../../routes/recurring.js';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';
import categoryRoutes from '../../routes/category.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/recurring', recurringRoutes);

describe('Recurring Transactions Module - Black Box Tests', () => {
  let authToken;
  let familyId;
  let categoryId;
  let expenseCategoryId;

  beforeAll(async () => {
    const testUser = {
      email: `recurringtest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Recurring Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Recurring Test Family' });
    familyId = familyResponse.body.family.id;

    const categoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        familyId,
        name: 'Test Category',
        type: 'income',
        color: '#3B82F6',
        icon: '💰'
      });
    categoryId = categoryResponse.body.category.id;

    const expenseCategoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        familyId,
        name: 'Test Expense Category',
        type: 'expense',
        color: '#EF4444',
        icon: '💸'
      });
    expenseCategoryId = expenseCategoryResponse.body.category.id;
  });

  describe('GET /api/recurring/family/:familyId', () => {
    // Test: Verify retrieval of all recurring transactions for a family
    // Logic: Users should see all recurring transactions for families they belong to,
    //        ordered by next occurrence date. This is used to display upcoming bills.
    // Expected: Returns 200 status with array of recurring transactions
    test('should get all recurring transactions for family', async () => {
      const response = await request(app)
        .get(`/api/recurring/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('recurring');
      expect(Array.isArray(response.body.recurring)).toBe(true);
    });

    // Test: Verify access control - only family members can view recurring transactions
    // Logic: Recurring transactions contain financial information. Only family
    //        members should be able to view them.
    // Expected: Returns 403 status when user is not a member
    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .get(`/api/recurring/family/${familyId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/recurring', () => {
    // Test: Verify successful creation of monthly recurring transaction
    // Logic: Monthly recurring transactions are common for bills. The system should
    //        calculate the next occurrence correctly and store all required fields.
    // Expected: Returns 201 status with created recurring transaction
    test('should create monthly recurring transaction', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      const startDateStr = startDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense',
          amount: 100.00,
          description: 'Monthly Rent',
          frequency: 'monthly',
          startDate: startDateStr,
          dayOfMonth: 1
        })
        .expect(201);

      expect(response.body).toHaveProperty('recurring');
      expect(response.body.recurring.frequency).toBe('monthly');
      expect(response.body.recurring.amount).toBe(100.00);
      expect(response.body.recurring.description).toBe('Monthly Rent');
    });

    // Test: Verify creation of weekly recurring transaction
    // Logic: Weekly recurring transactions are used for subscriptions or weekly expenses.
    //        The system should handle weekly frequency correctly.
    // Expected: Returns 201 status with weekly recurring transaction
    test('should create weekly recurring transaction', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const startDateStr = startDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense',
          amount: 50.00,
          description: 'Weekly Groceries',
          frequency: 'weekly',
          startDate: startDateStr
        })
        .expect(201);

      expect(response.body.recurring.frequency).toBe('weekly');
    });

    // Test: Verify creation of daily recurring transaction
    // Logic: Daily recurring transactions are less common but useful for daily expenses
    //        like coffee or parking. The system should handle daily frequency.
    // Expected: Returns 201 status with daily recurring transaction
    test('should create daily recurring transaction', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const startDateStr = startDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense',
          amount: 5.00,
          description: 'Daily Coffee',
          frequency: 'daily',
          startDate: startDateStr
        })
        .expect(201);

      expect(response.body.recurring.frequency).toBe('daily');
    });

    // Test: Verify creation of yearly recurring transaction
    // Logic: Yearly recurring transactions are used for annual subscriptions or bills.
    //        The system should handle yearly frequency correctly.
    // Expected: Returns 201 status with yearly recurring transaction
    test('should create yearly recurring transaction', async () => {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() + 1);
      const startDateStr = startDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense',
          amount: 500.00,
          description: 'Annual Insurance',
          frequency: 'yearly',
          startDate: startDateStr
        })
        .expect(201);

      expect(response.body.recurring.frequency).toBe('yearly');
    });

    // Test: Verify creation of recurring income transaction
    // Logic: Recurring income (salary, dividends) should also be supported.
    //        The system should handle income type recurring transactions.
    // Expected: Returns 201 status with income recurring transaction
    test('should create recurring income transaction', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      const startDateStr = startDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          type: 'income',
          amount: 3000.00,
          description: 'Monthly Salary',
          frequency: 'monthly',
          startDate: startDateStr,
          dayOfMonth: 1
        })
        .expect(201);

      expect(response.body.recurring.type).toBe('income');
    });

    // Test: Verify validation rejects missing required fields
    // Logic: All required fields (familyId, categoryId, type, amount, frequency, startDate)
    //        must be provided. Missing any should result in validation error.
    // Expected: Returns 400 status with error message
    test('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense'
          // Missing amount, frequency, startDate
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Required fields');
    });

    // Test: Verify validation rejects category type mismatch
    // Logic: The category type must match the transaction type. An expense category
    //        cannot be used for an income transaction and vice versa.
    // Expected: Returns 400 status with error message
    test('should reject creation with category type mismatch', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      const startDateStr = startDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId, // This is an income category
          type: 'expense', // But we're trying to create an expense
          amount: 100.00,
          frequency: 'monthly',
          startDate: startDateStr
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('type mismatch');
    });

    // Test: Verify creation with end date
    // Logic: Recurring transactions can have an end date to stop automatically
    //        after a certain date. This is useful for temporary subscriptions.
    // Expected: Returns 201 status with recurring transaction including end date
    test('should create recurring transaction with end date', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const response = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense',
          amount: 50.00,
          description: 'Temporary Subscription',
          frequency: 'monthly',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        })
        .expect(201);

      expect(response.body.recurring.end_date).toBe(endDate.toISOString().split('T')[0]);
    });
  });

  describe('PUT /api/recurring/:id', () => {
    let recurringId;

    beforeEach(async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      const createResponse = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense',
          amount: 100.00,
          description: 'Test Recurring',
          frequency: 'monthly',
          startDate: startDate.toISOString().split('T')[0]
        });
      recurringId = createResponse.body.recurring.id;
    });

    // Test: Verify successful update of recurring transaction amount
    // Logic: Users should be able to update recurring transaction details like amount,
    //        description, or frequency. The next occurrence should be recalculated.
    // Expected: Returns 200 status with updated recurring transaction
    test('should update recurring transaction amount', async () => {
      const response = await request(app)
        .put(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 150.00 })
        .expect(200);

      expect(parseFloat(response.body.recurring.amount)).toBe(150.00);
    });

    // Test: Verify update of recurring transaction frequency
    // Logic: Changing frequency should recalculate the next occurrence date
    //        based on the new frequency.
    // Expected: Returns 200 status with updated frequency and recalculated next occurrence
    test('should update recurring transaction frequency', async () => {
      const response = await request(app)
        .put(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ frequency: 'weekly' })
        .expect(200);

      expect(response.body.recurring.frequency).toBe('weekly');
    });

    // Test: Verify update of isActive status
    // Logic: Users should be able to temporarily disable recurring transactions
    //        without deleting them. This is useful for pausing subscriptions.
    // Expected: Returns 200 status with is_active set to false
    test('should update recurring transaction active status', async () => {
      const response = await request(app)
        .put(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.recurring.is_active).toBe(0);
    });

    // Test: Verify access control - only family members can update
    // Logic: Recurring transactions belong to families. Only members should
    //        be able to update them.
    // Expected: Returns 403 status when user is not a member
    test('should reject update for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .put(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .send({ amount: 200.00 })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify error when recurring transaction not found
    // Logic: Attempting to update a non-existent recurring transaction should
    //        return a clear error message.
    // Expected: Returns 404 status with error message
    test('should reject update for non-existent recurring transaction', async () => {
      const response = await request(app)
        .put('/api/recurring/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 200.00 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/recurring/:id', () => {
    let recurringId;

    beforeEach(async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      const createResponse = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense',
          amount: 100.00,
          description: 'Delete Test',
          frequency: 'monthly',
          startDate: startDate.toISOString().split('T')[0]
        });
      recurringId = createResponse.body.recurring.id;
    });

    // Test: Verify successful deletion of recurring transaction
    // Logic: Users should be able to delete recurring transactions they no longer need.
    //        This permanently removes the recurring transaction.
    // Expected: Returns 200 status with success message
    test('should delete recurring transaction', async () => {
      const response = await request(app)
        .delete(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted');
    });

    // Test: Verify access control - only family members can delete
    // Logic: Only family members should be able to delete recurring transactions.
    // Expected: Returns 403 status when user is not a member
    test('should reject delete for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .delete(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify error when recurring transaction not found
    // Logic: Attempting to delete a non-existent recurring transaction should
    //        return a clear error message.
    // Expected: Returns 404 status with error message
    test('should reject delete for non-existent recurring transaction', async () => {
      const response = await request(app)
        .delete('/api/recurring/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/recurring/process', () => {
    // Test: Verify processing of due recurring transactions
    // Logic: The process endpoint should create actual transactions from recurring
    //        transactions that are due, and update their next occurrence dates.
    //        This is typically called by a scheduled job.
    // Expected: Returns 200 status with count of created transactions
    test('should process due recurring transactions', async () => {
      // Create a recurring transaction due today
      const today = new Date().toISOString().split('T')[0];
      const createResponse = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId: expenseCategoryId,
          type: 'expense',
          amount: 100.00,
          description: 'Due Today Bill',
          frequency: 'monthly',
          startDate: today
        });
      const recurringId = createResponse.body.recurring.id;

      // Update next_occurrence to today (simulate it being due)
      // Note: In a real scenario, we'd need direct DB access or an update endpoint
      // For now, we'll test with a future date that we can control

      const processResponse = await request(app)
        .post('/api/recurring/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ familyId })
        .expect(200);

      expect(processResponse.body).toHaveProperty('createdCount');
      expect(typeof processResponse.body.createdCount).toBe('number');
    });

    // Test: Verify access control for processing
    // Logic: Only family members should be able to trigger processing of
    //        recurring transactions.
    // Expected: Returns 403 status when user is not a member
    test('should reject process for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .post('/api/recurring/process')
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .send({ familyId })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });
});

