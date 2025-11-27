/**
 * Additional Black Box Tests for Budgets Module - Edge Cases
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

describe('Budgets Module - Additional Edge Case Tests', () => {
  let authToken;
  let familyId;
  let categoryId;

  beforeAll(async () => {
    const testUser = {
      email: `budgetedge${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Budget Edge Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Budget Edge Test Family' });
    familyId = familyResponse.body.family.id;

    const categoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        familyId,
        name: 'Edge Test Category',
        type: 'expense',
        color: '#3B82F6',
        icon: '💰'
      });
    categoryId = categoryResponse.body.category.id;
  });

  describe('GET /api/budget/family/:familyId - Edge Cases', () => {
    // Test: Verify default month and year when not provided
    // Logic: If month/year are not provided in query params, the system should
    //        default to the current month and year. This is used when loading
    //        the budgets page without specifying a date.
    // Expected: Returns budgets for current month/year when params not provided
    test('should use current month and year when not provided', async () => {
      const response = await request(app)
        .get(`/api/budget/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('budgets');
      expect(Array.isArray(response.body.budgets)).toBe(true);
    });

    // Test: Verify error handling for access denied
    // Logic: If a user tries to access budgets for a family they're not a member of,
    //        the system should return 403 (access denied) rather than 500.
    // Expected: Returns 403 status with error message
    test('should handle access denied gracefully', async () => {
      // This test verifies access control works correctly
      // Non-existent family or non-member access should return 403
      const response = await request(app)
        .get(`/api/budget/family/99999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403); // Should return 403 for access denied

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/budget/:id - Edge Cases', () => {
    let budgetId;

    beforeEach(async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const createResponse = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 500.00,
          month,
          year
        });
      budgetId = createResponse.body.budget.id;
    });

    // Test: Verify update of month only
    // Logic: Users should be able to update just the month without changing
    //        amount or year. This is useful for moving budgets between months.
    // Expected: Returns 200 status with updated month
    test('should update month only', async () => {
      const newMonth = 6; // June
      const response = await request(app)
        .put(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ month: newMonth })
        .expect(200);

      expect(response.body.budget.month).toBe(newMonth);
    });

    // Test: Verify update of year only
    // Logic: Users should be able to update just the year, useful for
    //        copying budgets to next year.
    // Expected: Returns 200 status with updated year
    test('should update year only', async () => {
      const newYear = new Date().getFullYear() + 1;
      const response = await request(app)
        .put(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ year: newYear })
        .expect(200);

      expect(response.body.budget.year).toBe(newYear);
    });

    // Test: Verify update of amount only
    // Logic: Users should be able to update just the amount without changing
    //        month or year. This is the most common update operation.
    // Expected: Returns 200 status with updated amount
    test('should update amount only', async () => {
      const response = await request(app)
        .put(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 750.00 })
        .expect(200);

      expect(parseFloat(response.body.budget.amount)).toBe(750.00);
    });

    // Test: Verify validation rejects invalid month in update
    // Logic: Month must be between 1 and 12. Invalid months should be rejected.
    // Expected: Returns 400 status with error message
    test('should reject update with invalid month', async () => {
      const response = await request(app)
        .put(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ month: 13 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('between 1 and 12');
    });

    // Test: Verify validation rejects negative amount in update
    // Logic: Budget amounts cannot be negative. This should be validated on update.
    // Expected: Returns 400 status with error message
    test('should reject update with negative amount', async () => {
      const response = await request(app)
        .put(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -100 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('negative');
    });

    // Test: Verify error handling for non-existent budget
    // Logic: Attempting to update a non-existent budget should return 404.
    // Expected: Returns 404 status with error message
    test('should reject update for non-existent budget', async () => {
      const response = await request(app)
        .put('/api/budget/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 1000 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    // Test: Verify access control for budget updates
    // Logic: Only family members should be able to update budgets.
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
        .put(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .send({ amount: 1000 })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/budget/:id - Edge Cases', () => {
    let budgetId;

    beforeEach(async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const createResponse = await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 500.00,
          month,
          year
        });
      budgetId = createResponse.body.budget.id;
    });

    // Test: Verify error handling for non-existent budget deletion
    // Logic: Attempting to delete a non-existent budget should return 404.
    // Expected: Returns 404 status with error message
    test('should reject delete for non-existent budget', async () => {
      const response = await request(app)
        .delete('/api/budget/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    // Test: Verify access control for budget deletion
    // Logic: Only family members should be able to delete budgets.
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
        .delete(`/api/budget/${budgetId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });
});

