/**
 * Black Box Tests for Currency Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import currencyRoutes from '../../routes/currency.js';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/currency', currencyRoutes);

describe('Currency Module - Black Box Tests', () => {
  let authToken;
  let familyId;

  beforeAll(async () => {
    const testUser = {
      email: `currencytest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Currency Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Currency Test Family', currency: 'USD' });
    familyId = familyResponse.body.family.id;
  });

  describe('GET /api/currency/rates', () => {
    // Test: Verify retrieval of exchange rates with default base currency (USD)
    // Expected: Returns 200 status with base currency and rates object
    test('should get exchange rates for default base currency (USD)', async () => {
      const response = await request(app)
        .get('/api/currency/rates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('base');
      expect(response.body).toHaveProperty('rates');
      expect(response.body.base).toBe('USD');
      expect(typeof response.body.rates).toBe('object');
    });

    // Test: Verify retrieval of exchange rates for a specific base currency (EUR)
    // Expected: Returns 200 status with specified base currency and corresponding rates
    test('should get exchange rates for specified base currency', async () => {
      const response = await request(app)
        .get('/api/currency/rates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ base: 'EUR' })
        .expect(200);

      expect(response.body.base).toBe('EUR');
      expect(response.body.rates).toBeDefined();
    });

    // Test: Verify graceful handling of invalid base currency (should use fallback rates or return error)
    // Expected: Returns either 200 with fallback rates or 500 error
    test('should handle invalid base currency gracefully', async () => {
      const response = await request(app)
        .get('/api/currency/rates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ base: 'INVALID' });

      // Should either return 200 with fallback rates or 500
      expect([200, 500]).toContain(response.status);
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/currency/rates')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/currency/convert', () => {
    // Test: Verify currency conversion between different currencies (USD to EUR)
    // Expected: Returns 200 status with original amount, converted amount, and formatted values
    test('should convert amount between currencies', async () => {
      const response = await request(app)
        .get('/api/currency/convert')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          amount: 100,
          from: 'USD',
          to: 'EUR'
        })
        .expect(200);

      expect(response.body).toHaveProperty('original');
      expect(response.body).toHaveProperty('converted');
      expect(response.body).toHaveProperty('from');
      expect(response.body).toHaveProperty('to');
      expect(response.body).toHaveProperty('formatted');
      expect(response.body.original).toBe(100);
      expect(response.body.from).toBe('USD');
      expect(response.body.to).toBe('EUR');
      expect(typeof response.body.converted).toBe('number');
    });

    // Test: Verify conversion returns same amount when from and to currencies are identical
    // Expected: Returns 200 status with converted amount equal to original amount
    test('should return same amount when converting to same currency', async () => {
      const response = await request(app)
        .get('/api/currency/convert')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          amount: 50,
          from: 'USD',
          to: 'USD'
        })
        .expect(200);

      expect(response.body.converted).toBe(50);
    });

    // Test: Verify validation requires all parameters (amount, from, to) for conversion
    // Expected: Returns 400 status with error message indicating required fields
    test('should reject conversion with missing parameters', async () => {
      const response = await request(app)
        .get('/api/currency/convert')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          amount: 100
          // Missing from and to
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    // Test: Verify conversion works correctly for various currency pairs (USD-AMD, EUR-RUB, AMD-USD)
    // Expected: Returns 200 status with valid converted amounts for all pairs
    test('should convert between different currency pairs', async () => {
      const testCases = [
        { from: 'USD', to: 'AMD', amount: 10 },
        { from: 'EUR', to: 'RUB', amount: 50 },
        { from: 'AMD', to: 'USD', amount: 1000 }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .get('/api/currency/convert')
          .set('Authorization', `Bearer ${authToken}`)
          .query(testCase)
          .expect(200);

        expect(response.body.converted).toBeGreaterThan(0);
        expect(response.body.from).toBe(testCase.from);
        expect(response.body.to).toBe(testCase.to);
      }
    });

    // Test: Verify authentication is required for currency conversion
    // Expected: Returns 401 status when Authorization header is missing
    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/currency/convert')
        .query({ amount: 100, from: 'USD', to: 'EUR' })
        .expect(401);
    });
  });

  describe('GET /api/currency/family/:familyId', () => {
    // Test: Verify retrieval of family's currency information (currency code, symbol, rates)
    // Expected: Returns 200 status with currency, symbol, and exchange rates
    test('should get currency info for family', async () => {
      const response = await request(app)
        .get(`/api/currency/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('currency');
      expect(response.body).toHaveProperty('symbol');
      expect(response.body).toHaveProperty('rates');
      expect(response.body.currency).toBe('USD');
      expect(response.body.symbol).toBe('$');
    });

    // Test: Verify access control - only family members can view family currency info
    // Expected: Returns 403 status when user is not a member of the family
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
        .get(`/api/currency/family/${familyId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify access control returns 403 (not 404) for non-existent families
    // Expected: Returns 403 status because access check happens before existence check
    test('should return 403 for non-existent family (access denied)', async () => {
      // Non-existent family returns 403 because user is not a member
      const response = await request(app)
        .get('/api/currency/family/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/currency/family/${familyId}`)
        .expect(401);
    });
  });
});
