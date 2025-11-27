/**
 * Black Box Tests for Dashboard Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import dashboardRoutes from '../../routes/dashboard.js';
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
app.use('/api/dashboard', dashboardRoutes);

describe('Dashboard Module - Black Box Tests', () => {
  let authToken;
  let familyId;
  let categoryId;

  beforeAll(async () => {
    const testUser = {
      email: `dashboardtest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Dashboard Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Dashboard Test Family' });
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

  describe('GET /api/dashboard/family/:familyId', () => {
    // Test: Verify retrieval of dashboard data with default month/year
    // Logic: Dashboard should return summary, spending by category, recent transactions,
    //        and goals. When month/year not provided, it should default to current month.
    // Expected: Returns 200 status with dashboard data structure
    test('should get dashboard data with default month/year', async () => {
      const response = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('spendingByCategory');
      expect(response.body).toHaveProperty('recentTransactions');
      expect(response.body).toHaveProperty('goals');
      expect(response.body.summary).toHaveProperty('totalIncome');
      expect(response.body.summary).toHaveProperty('totalExpenses');
      expect(response.body.summary).toHaveProperty('balance');
    });

    // Test: Verify dashboard data with specified month and year
    // Logic: Users should be able to view dashboard data for any month/year
    //        by providing query parameters. This enables historical analysis.
    // Expected: Returns 200 status with data for specified month/year
    test('should get dashboard data for specified month/year', async () => {
      const month = 6; // June
      const year = 2024;

      const response = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ month, year })
        .expect(200);

      expect(response.body.summary.month).toBe(month);
      expect(response.body.summary.year).toBe(year);
    });

    // Test: Verify dashboard includes spending by category
    // Logic: Dashboard should show spending breakdown by category with both
    //        spent amounts and budgeted amounts for comparison.
    // Expected: Returns array of categories with spent and budgeted amounts
    test('should include spending by category', async () => {
      // Create a transaction to generate spending data
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          type: 'expense',
          amount: 50.00,
          description: 'Test Expense',
          date: new Date().toISOString().split('T')[0]
        });

      const response = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.spendingByCategory)).toBe(true);
      if (response.body.spendingByCategory.length > 0) {
        expect(response.body.spendingByCategory[0]).toHaveProperty('name');
        expect(response.body.spendingByCategory[0]).toHaveProperty('spent');
        expect(response.body.spendingByCategory[0]).toHaveProperty('budgeted');
      }
    });

    // Test: Verify dashboard includes recent transactions
    // Logic: Dashboard should show the most recent transactions (up to 10)
    //        to give users a quick view of recent activity.
    // Expected: Returns array of recent transactions (max 10)
    test('should include recent transactions', async () => {
      const response = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.recentTransactions)).toBe(true);
      expect(response.body.recentTransactions.length).toBeLessThanOrEqual(10);
    });

    // Test: Verify dashboard includes active goals
    // Logic: Dashboard should show active goals (not completed and not past target date)
    //        to help users track their financial goals.
    // Expected: Returns array of active goals (max 5)
    test('should include active goals', async () => {
      const response = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.goals)).toBe(true);
      expect(response.body.goals.length).toBeLessThanOrEqual(5);
    });

    // Test: Verify dashboard calculates balance correctly
    // Logic: Balance should be calculated as totalIncome - totalExpenses.
    //        This is a key metric shown on the dashboard.
    // Expected: Balance equals income minus expenses
    test('should calculate balance correctly', async () => {
      const response = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { totalIncome, totalExpenses, balance } = response.body.summary;
      expect(balance).toBe(totalIncome - totalExpenses);
    });

    // Test: Verify dashboard calculates budget usage percentage
    // Logic: When expense budget exists, the system should calculate what
    //        percentage of the budget has been used. This helps users track
    //        their spending against their budget.
    // Expected: expenseBudgetUsed is calculated as (totalExpenses / expenseBudget) * 100
    test('should calculate budget usage percentage', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      // Create a budget
      await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          categoryId,
          amount: 1000.00,
          month,
          year
        });

      const response = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ month, year })
        .expect(200);

      if (response.body.summary.expenseBudget > 0) {
        const expectedPercentage = (response.body.summary.totalExpenses / response.body.summary.expenseBudget) * 100;
        expect(response.body.summary.expenseBudgetUsed).toBeCloseTo(expectedPercentage, 1);
      }
    });

    // Test: Verify access control - only family members can view dashboard
    // Logic: Dashboard contains sensitive financial information. Only family
    //        members should be able to view it.
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
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify error handling for invalid month/year
    // Logic: The system should handle invalid month/year values gracefully,
    //        either by defaulting to current month/year or returning an error.
    // Expected: Handles invalid values without crashing
    test('should handle invalid month/year gracefully', async () => {
      const response = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ month: 13, year: -1 })
        .expect(200); // Should default to current month/year

      expect(response.body).toHaveProperty('summary');
    });
  });
});

