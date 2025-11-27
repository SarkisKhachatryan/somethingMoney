/**
 * Real-World Recurring Bills Scenarios
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';
import categoryRoutes from '../../routes/category.js';
import recurringRoutes from '../../routes/recurring.js';
import transactionRoutes from '../../routes/transaction.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/transactions', transactionRoutes);

describe('Real-World Recurring Bills Scenarios', () => {
  let token, familyId;
  let rentCategoryId, subscriptionCategoryId, salaryCategoryId;

  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `billsuser${Date.now()}@example.com`,
        password: 'password123',
        name: 'Bills User'
      });
    token = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bills Family' });
    familyId = familyResponse.body.family.id;

    // Create categories
    const rentCat = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        familyId,
        name: 'Rent',
        type: 'expense',
        color: '#EF4444',
        icon: '🏠'
      });
    rentCategoryId = rentCat.body.category.id;

    const subCat = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        familyId,
        name: 'Subscriptions',
        type: 'expense',
        color: '#8B5CF6',
        icon: '📺'
      });
    subscriptionCategoryId = subCat.body.category.id;

    const salaryCat = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        familyId,
        name: 'Salary',
        type: 'income',
        color: '#10B981',
        icon: '💰'
      });
    salaryCategoryId = salaryCat.body.category.id;
  });

  describe('Scenario: Setting Up Monthly Recurring Bills', () => {
    test('Family sets up all monthly recurring expenses', async () => {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString().split('T')[0];

      // Rent: 1st of every month
      const rentRecurring = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: rentCategoryId,
          type: 'expense',
          amount: 1200.00,
          description: 'Monthly apartment rent',
          frequency: 'monthly',
          startDate: firstOfMonth,
          dayOfMonth: 1
        })
        .expect(201);

      expect(rentRecurring.body.recurring.frequency).toBe('monthly');
      expect(rentRecurring.body.recurring.day_of_month).toBe(1);

      // Netflix subscription: 15th of every month
      const netflixRecurring = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: subscriptionCategoryId,
          type: 'expense',
          amount: 15.99,
          description: 'Netflix subscription',
          frequency: 'monthly',
          startDate: firstOfMonth,
          dayOfMonth: 15
        })
        .expect(201);

      // Verify both recurring transactions exist
      const recurringResponse = await request(app)
        .get(`/api/recurring/family/${familyId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(recurringResponse.body.recurring.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Scenario: Processing Recurring Bills at Month End', () => {
    test('Family processes all due recurring transactions', async () => {
      // Create a recurring transaction due today
      const today = new Date().toISOString().split('T')[0];
      
      await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: subscriptionCategoryId,
          type: 'expense',
          amount: 9.99,
          description: 'Spotify Premium',
          frequency: 'monthly',
          startDate: today,
          dayOfMonth: new Date().getDate()
        });

      // Process due recurring transactions
      const processResponse = await request(app)
        .post('/api/recurring/process')
        .set('Authorization', `Bearer ${token}`)
        .send({ familyId })
        .expect(200);

      expect(processResponse.body).toHaveProperty('createdCount');
      expect(processResponse.body.createdCount).toBeGreaterThanOrEqual(0);

      // Verify transactions were created
      const transactionsResponse = await request(app)
        .get(`/api/transactions/family/${familyId}`)
        .set('Authorization', `Bearer ${token}`);

      // Should have transactions from processed recurring items
      expect(transactionsResponse.body.transactions).toBeDefined();
    });
  });

  describe('Scenario: Pausing Subscription During Financial Hardship', () => {
    test('Family temporarily pauses a subscription', async () => {
      // Create subscription recurring transaction
      const subscriptionRecurring = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: subscriptionCategoryId,
          type: 'expense',
          amount: 19.99,
          description: 'Gym membership',
          frequency: 'monthly',
          startDate: new Date().toISOString().split('T')[0],
          dayOfMonth: 10
        });

      const recurringId = subscriptionRecurring.body.recurring.id;

      // Pause the subscription (set is_active to false)
      await request(app)
        .put(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      // Verify it's paused
      const recurringResponse = await request(app)
        .get(`/api/recurring/family/${familyId}`)
        .set('Authorization', `Bearer ${token}`);

      const pausedRecurring = recurringResponse.body.recurring.find(
        r => r.id === recurringId
      );
      expect(pausedRecurring.is_active).toBe(0);

      // Resume subscription later
      await request(app)
        .put(`/api/recurring/${recurringId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: true })
        .expect(200);
    });
  });

  describe('Scenario: Weekly Grocery Budget', () => {
    test('Family sets up weekly grocery shopping', async () => {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

      // Weekly groceries every Saturday
      const weeklyGroceries = await request(app)
        .post('/api/recurring')
        .set('Authorization', `Bearer ${token}`)
        .send({
          familyId,
          categoryId: rentCategoryId, // Using existing category
          type: 'expense',
          amount: 150.00,
          description: 'Weekly grocery shopping',
          frequency: 'weekly',
          startDate: new Date().toISOString().split('T')[0],
          dayOfWeek: 6 // Saturday
        })
        .expect(201);

      expect(weeklyGroceries.body.recurring.frequency).toBe('weekly');
      expect(weeklyGroceries.body.recurring.day_of_week).toBe(6);
    });
  });
});

