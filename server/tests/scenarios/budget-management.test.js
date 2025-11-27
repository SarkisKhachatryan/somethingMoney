/**
 * Real-World Budget Management Scenarios
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';
import categoryRoutes from '../../routes/category.js';
import budgetRoutes from '../../routes/budget.js';
import transactionRoutes from '../../routes/transaction.js';
import dashboardRoutes from '../../routes/dashboard.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

describe('Real-World Budget Management Scenarios', () => {
  let token, familyId;
  let categories = {};

  beforeAll(async () => {
    // Setup: Create user and family
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `budgetuser${Date.now()}@example.com`,
        password: 'password123',
        name: 'Budget User'
      });
    token = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Budget Family' });
    familyId = familyResponse.body.family.id;

    // Create categories
    const catNames = ['Housing', 'Food', 'Transportation', 'Entertainment', 'Utilities'];
    for (const name of catNames) {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          name,
          type: 'expense',
          color: '#3B82F6',
          icon: '💰'
        });
      categories[name] = response.body.category.id;
    }
  });

  describe('Scenario: Zero-Based Budgeting Approach', () => {
    test('Family allocates every dollar of income to categories', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const monthlyIncome = 5000;

      // Allocate income across categories (zero-based budgeting)
      const allocations = {
        'Housing': 1500,
        'Food': 800,
        'Transportation': 600,
        'Entertainment': 400,
        'Utilities': 300,
        'Savings': 1400 // Remaining goes to savings
      };

      // Set budgets for each category
      for (const [categoryName, amount] of Object.entries(allocations)) {
        if (categories[categoryName]) {
          await request(app)
            .post('/api/budget')
            .set('Authorization', `Bearer ${token}`)
            .send({
              familyId,
              categoryId: categories[categoryName],
              amount,
              month,
              year
            });
        }
      }

      // Verify total budget equals income
      const budgetsResponse = await request(app)
        .get(`/api/budget/family/${familyId}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ month, year });

      const totalBudget = budgetsResponse.body.budgets.reduce(
        (sum, b) => sum + parseFloat(b.amount), 0
      );

      // Should be close to income (allowing for savings category)
      expect(totalBudget).toBeGreaterThan(monthlyIncome * 0.9);
    });
  });

  describe('Scenario: Tracking Spending Throughout Month', () => {
    test('Family tracks daily expenses and monitors remaining budget', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const today = new Date().toISOString().split('T')[0];

      // Day 1: Grocery shopping
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: categories['Food'],
          type: 'expense',
          amount: 150.00,
          description: 'Weekly groceries',
          date: today
        });

      // Day 5: Gas for car
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: categories['Transportation'],
          type: 'expense',
          amount: 60.00,
          description: 'Gas fill-up',
          date: today
        });

      // Day 10: Movie night
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: categories['Entertainment'],
          type: 'expense',
          amount: 45.00,
          description: 'Movie tickets and snacks',
          date: today
        });

      // Check dashboard to see remaining budgets
      const dashboardResponse = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ month, year });

      expect(dashboardResponse.body.spendingByCategory.length).toBeGreaterThan(0);
      
      // Verify spending is tracked
      const foodSpending = dashboardResponse.body.spendingByCategory.find(
        c => c.id === categories['Food']
      );
      if (foodSpending) {
        expect(parseFloat(foodSpending.spent)).toBeGreaterThan(0);
      }
    });
  });

  describe('Scenario: Budget Adjustment Mid-Month', () => {
    test('Family adjusts budget when unexpected expense occurs', async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      // Original entertainment budget
      await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: categories['Entertainment'],
          amount: 200,
          month,
          year
        });

      // Unexpected expense: Car repair
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: categories['Transportation'],
          type: 'expense',
          amount: 500.00,
          description: 'Car repair - unexpected expense',
          date: new Date().toISOString().split('T')[0]
        });

      // Adjust transportation budget to accommodate
      const budgetsResponse = await request(app)
        .get(`/api/budget/family/${familyId}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ month, year });

      const transportBudget = budgetsResponse.body.budgets.find(
        b => b.category_id === categories['Transportation']
      );

      if (transportBudget) {
        const newAmount = parseFloat(transportBudget.amount) + 300; // Increase by 300

        await request(app)
          .post('/api/budget')
          .set('Authorization', `Bearer ${token}`)
          .send({
            familyId,
            categoryId: categories['Transportation'],
            amount: newAmount,
            month,
            year
          });
      }
    });
  });
});

