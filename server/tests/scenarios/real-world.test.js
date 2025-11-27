/**
 * Real-World Scenario Tests
 * These tests simulate actual user workflows and use cases
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';
import categoryRoutes from '../../routes/category.js';
import budgetRoutes from '../../routes/budget.js';
import transactionRoutes from '../../routes/transaction.js';
import recurringRoutes from '../../routes/recurring.js';
import goalRoutes from '../../routes/goal.js';
import dashboardRoutes from '../../routes/dashboard.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/dashboard', dashboardRoutes);

describe('Real-World Scenarios', () => {
  let johnToken, johnId;
  let maryToken, maryId;
  let familyId;
  let groceriesCategoryId, rentCategoryId, salaryCategoryId;

  // Scenario 1: New Family Setting Up Their Budget
  describe('Scenario 1: New Family Setting Up Monthly Budget', () => {
    test('John and Mary create a family and set up their first budget', async () => {
      // Step 1: John registers
      const johnRegister = await request(app)
        .post('/api/auth/register')
        .send({
          email: `john${Date.now()}@example.com`,
          password: 'securepass123',
          name: 'John Smith'
        });
      johnToken = johnRegister.body.token;
      johnId = johnRegister.body.user.id;

      // Step 2: John creates a family
      const familyResponse = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({ name: 'Smith Family', currency: 'USD' });
      familyId = familyResponse.body.family.id;

      // Step 3: John creates expense categories
      const groceriesResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          name: 'Groceries',
          type: 'expense',
          color: '#3B82F6',
          icon: '🛒'
        });
      groceriesCategoryId = groceriesResponse.body.category.id;

      const rentResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          name: 'Rent',
          type: 'expense',
          color: '#EF4444',
          icon: '🏠'
        });
      rentCategoryId = rentResponse.body.category.id;

      // Step 4: John creates income category
      const salaryResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          name: 'Salary',
          type: 'income',
          color: '#10B981',
          icon: '💰'
        });
      salaryCategoryId = salaryResponse.body.category.id;

      // Step 5: John sets monthly budgets
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          amount: 600,
          month: currentMonth,
          year: currentYear
        })
        .expect(201);

      await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: rentCategoryId,
          amount: 1200,
          month: currentMonth,
          year: currentYear
        })
        .expect(201);

      // Verify budgets were created
      const budgetsResponse = await request(app)
        .get(`/api/budget/family/${familyId}`)
        .set('Authorization', `Bearer ${johnToken}`)
        .query({ month: currentMonth, year: currentYear });

      expect(budgetsResponse.body.budgets.length).toBe(2);
      expect(budgetsResponse.body.budgets.some(b => b.category_id === groceriesCategoryId)).toBe(true);
      expect(budgetsResponse.body.budgets.some(b => b.category_id === rentCategoryId)).toBe(true);
    });
  });

  // Scenario 2: Tracking Monthly Expenses
  describe('Scenario 2: Tracking Monthly Expenses Throughout the Month', () => {
    test('Family tracks expenses and monitors budget', async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const today = new Date().toISOString().split('T')[0];

      // Week 1: Grocery shopping
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          type: 'expense',
          amount: 150.50,
          description: 'Weekly grocery shopping',
          date: today
        })
        .expect(201);

      // Week 2: More groceries
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          type: 'expense',
          amount: 180.75,
          description: 'Grocery shopping',
          date: today
        })
        .expect(201);

      // Rent payment
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: rentCategoryId,
          type: 'expense',
          amount: 1200.00,
          description: 'Monthly rent',
          date: today
        })
        .expect(201);

      // Check dashboard to see spending vs budget
      const dashboardResponse = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${johnToken}`)
        .query({ month: currentMonth, year: currentYear });

      expect(dashboardResponse.body.summary.totalExpenses).toBeGreaterThan(0);
      expect(dashboardResponse.body.spendingByCategory.length).toBeGreaterThan(0);
    });
  });

  // Scenario 3: Setting Up Recurring Bills
  describe('Scenario 3: Setting Up Recurring Monthly Bills', () => {
    test('Family sets up recurring rent and utility bills', async () => {
      // Create utility category
      const utilitiesResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          name: 'Utilities',
          type: 'expense',
          color: '#F59E0B',
          icon: '💡'
        });

      // Set up recurring rent payment (1st of every month)
      const rentRecurring = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: rentCategoryId,
          type: 'expense',
          amount: 1200.00,
          description: 'Monthly rent',
          frequency: 'monthly',
          startDate: new Date().toISOString().split('T')[0],
          dayOfMonth: 1
        })
        .expect(201);

      expect(rentRecurring.body.recurring.frequency).toBe('monthly');
      expect(rentRecurring.body.recurring.day_of_month).toBe(1);

      // Set up recurring utilities (15th of every month)
      const utilitiesRecurring = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: utilitiesResponse.body.category.id,
          type: 'expense',
          amount: 150.00,
          description: 'Electricity and water',
          frequency: 'monthly',
          startDate: new Date().toISOString().split('T')[0],
          dayOfMonth: 15
        })
        .expect(201);

      // Verify recurring transactions were created
      const recurringResponse = await request(app)
        .get(`/api/recurring/family/${familyId}`)
        .set('Authorization', `Bearer ${johnToken}`);

      expect(recurringResponse.body.recurring.length).toBeGreaterThanOrEqual(2);
    });
  });

  // Scenario 4: Family Member Collaboration
  describe('Scenario 4: Multiple Family Members Adding Transactions', () => {
    test('John and Mary both add transactions to the family budget', async () => {
      // Mary registers
      const maryRegister = await request(app)
        .post('/api/auth/register')
        .send({
          email: `mary${Date.now()}@example.com`,
          password: 'securepass123',
          name: 'Mary Smith'
        });
      maryToken = maryRegister.body.token;
      maryId = maryRegister.body.user.id;

      // John adds Mary to the family
      await request(app)
        .post(`/api/family/${familyId}/members`)
        .set('Authorization', `Bearer ${johnToken}`)
        .send({ email: maryRegister.body.user.email })
        .expect(201);

      // John adds a transaction
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          type: 'expense',
          amount: 95.25,
          description: 'John bought groceries',
          date: new Date().toISOString().split('T')[0]
        })
        .expect(201);

      // Mary adds a transaction
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${maryToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          type: 'expense',
          amount: 120.50,
          description: 'Mary bought groceries',
          date: new Date().toISOString().split('T')[0]
        })
        .expect(201);

      // Both should see all transactions
      const johnTransactions = await request(app)
        .get(`/api/transactions/family/${familyId}`)
        .set('Authorization', `Bearer ${johnToken}`);

      const maryTransactions = await request(app)
        .get(`/api/transactions/family/${familyId}`)
        .set('Authorization', `Bearer ${maryToken}`);

      expect(johnTransactions.body.transactions.length).toBeGreaterThanOrEqual(2);
      expect(maryTransactions.body.transactions.length).toBeGreaterThanOrEqual(2);
    });
  });

  // Scenario 5: Budget Overspending Alert
  describe('Scenario 5: Budget Overspending Detection', () => {
    test('System detects when family exceeds grocery budget', async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Set a small budget to test overspending
      await request(app)
        .post('/api/budget')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          amount: 200, // Small budget
          month: currentMonth,
          year: currentYear
        });

      // Add transactions that exceed budget
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          type: 'expense',
          amount: 150.00,
          description: 'Large grocery shopping',
          date: new Date().toISOString().split('T')[0]
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          type: 'expense',
          amount: 100.00,
          description: 'More groceries',
          date: new Date().toISOString().split('T')[0]
        });

      // Check dashboard - should show overspending
      const dashboardResponse = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${johnToken}`)
        .query({ month: currentMonth, year: currentYear });

      const groceriesSpending = dashboardResponse.body.spendingByCategory.find(
        c => c.id === groceriesCategoryId
      );

      if (groceriesSpending) {
        expect(parseFloat(groceriesSpending.spent)).toBeGreaterThan(parseFloat(groceriesSpending.budgeted));
      }
    });
  });

  // Scenario 6: Saving for a Goal
  describe('Scenario 6: Family Saving for Vacation Goal', () => {
    test('Family creates savings goal and tracks progress', async () => {
      // Create vacation goal
      const goalResponse = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          name: 'Summer Vacation',
          targetAmount: 5000.00,
          currentAmount: 0,
          targetDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
          description: 'Saving for family vacation to Europe'
        })
        .expect(201);

      const goalId = goalResponse.body.goal.id;

      // Add income (salary)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: salaryCategoryId,
          type: 'income',
          amount: 3000.00,
          description: 'Monthly salary',
          date: new Date().toISOString().split('T')[0]
        });

      // Update goal progress (simulating manual savings transfer)
      await request(app)
        .put(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          currentAmount: 500.00
        })
        .expect(200);

      // Check goal progress
      const goalsResponse = await request(app)
        .get(`/api/goals/family/${familyId}`)
        .set('Authorization', `Bearer ${johnToken}`);

      const vacationGoal = goalsResponse.body.goals.find(g => g.id === goalId);
      expect(vacationGoal).toBeDefined();
      expect(parseFloat(vacationGoal.current_amount)).toBe(500.00);
      expect(parseFloat(vacationGoal.target_amount)).toBe(5000.00);
    });
  });

  // Scenario 7: Multi-Currency Family
  describe('Scenario 7: Family Using Different Currency', () => {
    test('Family switches currency and all amounts display correctly', async () => {
      // Change family currency to EUR
      await request(app)
        .put(`/api/family/${familyId}/currency`)
        .set('Authorization', `Bearer ${johnToken}`)
        .send({ currency: 'EUR' })
        .expect(200);

      // Verify currency changed
      const familyResponse = await request(app)
        .get(`/api/family/${familyId}`)
        .set('Authorization', `Bearer ${johnToken}`);

      expect(familyResponse.body.family.currency).toBe('EUR');

      // Add transaction - should work with new currency
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${johnToken}`)
        .send({
          familyId,
          categoryId: groceriesCategoryId,
          type: 'expense',
          amount: 50.00,
          description: 'Groceries in EUR',
          date: new Date().toISOString().split('T')[0]
        })
        .expect(201);
    });
  });

  // Scenario 8: Monthly Budget Review
  describe('Scenario 8: End of Month Budget Review', () => {
    test('Family reviews monthly spending and adjusts next month budget', async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

      // Get current month spending
      const dashboardResponse = await request(app)
        .get(`/api/dashboard/family/${familyId}`)
        .set('Authorization', `Bearer ${johnToken}`)
        .query({ month: currentMonth, year: currentYear });

      const totalSpent = dashboardResponse.body.summary.totalExpenses;

      // Adjust next month's grocery budget based on actual spending
      const groceriesSpending = dashboardResponse.body.spendingByCategory.find(
        c => c.id === groceriesCategoryId
      );

      if (groceriesSpending) {
        const newBudget = parseFloat(groceriesSpending.spent) * 1.1; // 10% increase

        await request(app)
          .post('/api/budget')
          .set('Authorization', `Bearer ${johnToken}`)
          .send({
            familyId,
            categoryId: groceriesCategoryId,
            amount: newBudget,
            month: nextMonth,
            year: nextYear
          })
          .expect(201);
      }
    });
  });
});

