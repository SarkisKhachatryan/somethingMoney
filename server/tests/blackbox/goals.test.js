/**
 * Black Box Tests for Goals Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import goalRoutes from '../../routes/goal.js';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/goals', goalRoutes);

describe('Goals Module - Black Box Tests', () => {
  let authToken;
  let familyId;

  beforeAll(async () => {
    const testUser = {
      email: `goaltest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Goal Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Goal Test Family' });
    familyId = familyResponse.body.family.id;
  });

  describe('POST /api/goals', () => {
    test('should create goal with valid data', async () => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 6);

      const response = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Vacation Fund',
          targetAmount: 5000.00,
          currentAmount: 0,
          targetDate: targetDate.toISOString().split('T')[0],
          description: 'Saving for summer vacation'
        })
        .expect(201);

      expect(response.body).toHaveProperty('goal');
      expect(response.body.goal.name).toBe('Vacation Fund');
      expect(parseFloat(response.body.goal.target_amount)).toBe(5000.00);
      expect(parseFloat(response.body.goal.current_amount)).toBe(0.00);
    });

    test('should reject goal with missing required fields', async () => {
      const response = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId
          // Missing name, targetAmount, etc.
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject goal with target amount less than current amount', async () => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 6);

      const response = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Invalid Goal',
          targetAmount: 1000,
          currentAmount: 2000, // More than target
          targetDate: targetDate.toISOString().split('T')[0]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject goal with past target date', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const response = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Past Goal',
          targetAmount: 1000,
          currentAmount: 0,
          targetDate: pastDate.toISOString().split('T')[0]
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/goals/family/:familyId', () => {
    beforeEach(async () => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 3);

      await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Emergency Fund',
          targetAmount: 10000,
          currentAmount: 2500,
          targetDate: targetDate.toISOString().split('T')[0]
        });
    });

    test('should retrieve all goals for family', async () => {
      const response = await request(app)
        .get(`/api/goals/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('goals');
      expect(Array.isArray(response.body.goals)).toBe(true);
      expect(response.body.goals.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/goals/:id', () => {
    let goalId;

    beforeEach(async () => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 6);

      const response = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Car Purchase',
          targetAmount: 20000,
          currentAmount: 5000,
          targetDate: targetDate.toISOString().split('T')[0]
        });
      goalId = response.body.goal.id;
    });

    test('should update goal current amount', async () => {
      const response = await request(app)
        .put(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentAmount: 7500 })
        .expect(200);

      expect(parseFloat(response.body.goal.current_amount)).toBe(7500.00);
    });

    test('should update goal target amount', async () => {
      const response = await request(app)
        .put(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetAmount: 25000 })
        .expect(200);

      expect(parseFloat(response.body.goal.target_amount)).toBe(25000.00);
    });

    test('should reject update with current amount exceeding target', async () => {
      const response = await request(app)
        .put(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentAmount: 30000 }) // More than target of 20000
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/goals/:id', () => {
    let goalId;

    beforeEach(async () => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 3);

      const response = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Test Goal',
          targetAmount: 1000,
          currentAmount: 0,
          targetDate: targetDate.toISOString().split('T')[0]
        });
      goalId = response.body.goal.id;
    });

    test('should delete goal', async () => {
      await request(app)
        .delete(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/goals/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const found = getResponse.body.goals.find(g => g.id === goalId);
      expect(found).toBeUndefined();
    });
  });
});

